import logging
import time
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Protocol

from extensions.ext_redis import redis_client

logger = logging.getLogger(__name__)

LAST_ACCESS_KEY = "milvus:collection:last_access"
INITIALIZED_KEY = "milvus:collection:last_access:initialized"
RUN_LOCK_KEY = "milvus:collection:idle_release:run_lock"
ACTIVE_LEASE_SECONDS = 60 * 60
LIFECYCLE_LOCK_SECONDS = 120
LIFECYCLE_LOCK_BLOCKING_SECONDS = 65
FAILED_RELEASE_RETRY_SECONDS = 24 * 60 * 60


class MilvusLifecycleClient(Protocol):
    def list_collections(self) -> list[str]: ...

    def has_collection(self, collection_name: str) -> bool: ...

    def get_load_state(self, collection_name: str, **kwargs: Any) -> dict[str, Any]: ...

    def release_collection(self, collection_name: str, **kwargs: Any) -> Any: ...


def collection_active_key(collection_name: str) -> str:
    return f"milvus:collection:active:{collection_name}"


def collection_lifecycle_lock_key(collection_name: str) -> str:
    return f"milvus:collection:lifecycle_lock:{collection_name}"


def load_state_is_loaded(load_state: dict[str, Any]) -> bool:
    state = load_state.get("state")
    state_name = getattr(state, "name", str(state))
    return state_name == "Loaded" or state_name.endswith(": Loaded>")


@contextmanager
def collection_activity(collection_name: str) -> Iterator[None]:
    """Register an expiring activity lease so an in-flight Milvus operation is never released."""
    token = uuid.uuid4().hex
    active_key = collection_active_key(collection_name)
    lock_key = collection_lifecycle_lock_key(collection_name)
    now = time.time()

    with redis_client.lock(
        lock_key,
        timeout=LIFECYCLE_LOCK_SECONDS,
        blocking_timeout=LIFECYCLE_LOCK_BLOCKING_SECONDS,
    ):
        redis_client.zremrangebyscore(active_key, "-inf", now)
        redis_client.zadd(active_key, {token: now + ACTIVE_LEASE_SECONDS})
        redis_client.expire(active_key, ACTIVE_LEASE_SECONDS * 2)
        redis_client.zadd(LAST_ACCESS_KEY, {collection_name: now})

    try:
        yield
    finally:
        try:
            with redis_client.lock(
                lock_key,
                timeout=LIFECYCLE_LOCK_SECONDS,
                blocking_timeout=LIFECYCLE_LOCK_BLOCKING_SECONDS,
            ):
                redis_client.zrem(active_key, token)
                redis_client.zadd(LAST_ACCESS_KEY, {collection_name: time.time()})
        except Exception:
            # The lease expires automatically. Cleanup must never hide the Milvus operation's result.
            logger.exception("Failed to close Milvus collection activity lease: %s", collection_name)


@dataclass(frozen=True)
class IdleReleaseResult:
    initialized: int = 0
    examined: int = 0
    released: int = 0
    already_unloaded: int = 0
    deferred_active: int = 0
    failed: int = 0


class MilvusIdleCollectionReleaser:
    def __init__(
        self,
        client: MilvusLifecycleClient,
        idle_seconds: int,
        batch_size: int,
        redis: Any = redis_client,
    ) -> None:
        self._client = client
        self._idle_seconds = idle_seconds
        self._batch_size = batch_size
        self._redis = redis

    def initialize_loaded_collections(self) -> int:
        """Track existing collections once after deployment or a Redis reset without loading them."""
        if self._redis.exists(INITIALIZED_KEY):
            return 0

        now = time.time()
        collections = self._client.list_collections()
        for offset in range(0, len(collections), self._batch_size):
            batch = collections[offset : offset + self._batch_size]
            self._redis.zadd(LAST_ACCESS_KEY, dict.fromkeys(batch, now))
        self._redis.set(INITIALIZED_KEY, "1")
        return len(collections)

    def run(self) -> IdleReleaseResult:
        initialized = self.initialize_loaded_collections()
        cutoff = time.time() - self._idle_seconds
        counters = {
            "examined": 0,
            "released": 0,
            "already_unloaded": 0,
            "deferred_active": 0,
            "failed": 0,
        }

        while True:
            candidates = self._redis.zrangebyscore(
                LAST_ACCESS_KEY,
                "-inf",
                cutoff,
                start=0,
                num=self._batch_size,
            )
            if not candidates:
                break

            for raw_name in candidates:
                collection_name = raw_name.decode() if isinstance(raw_name, bytes) else str(raw_name)
                counters["examined"] += 1
                self._release_candidate(collection_name, cutoff, counters)

            # Batch size limits instantaneous pressure, not the total released in this nightly run.
            if len(candidates) == self._batch_size:
                time.sleep(1)

        return IdleReleaseResult(initialized=initialized, **counters)

    def _release_candidate(self, collection_name: str, cutoff: float, counters: dict[str, int]) -> None:
        active_key = collection_active_key(collection_name)
        try:
            with self._redis.lock(
                collection_lifecycle_lock_key(collection_name),
                timeout=LIFECYCLE_LOCK_SECONDS,
                blocking_timeout=LIFECYCLE_LOCK_BLOCKING_SECONDS,
            ):
                now = time.time()
                self._redis.zremrangebyscore(active_key, "-inf", now)
                last_access = self._redis.zscore(LAST_ACCESS_KEY, collection_name)
                if last_access is None or float(last_access) > cutoff:
                    return
                if self._redis.zcard(active_key):
                    counters["deferred_active"] += 1
                    self._redis.zadd(LAST_ACCESS_KEY, {collection_name: now})
                    return
                if not self._client.has_collection(collection_name):
                    self._redis.zrem(LAST_ACCESS_KEY, collection_name)
                    return
                if not load_state_is_loaded(self._client.get_load_state(collection_name=collection_name, timeout=5)):
                    counters["already_unloaded"] += 1
                    self._redis.zrem(LAST_ACCESS_KEY, collection_name)
                    return

                self._client.release_collection(collection_name=collection_name, timeout=60)
                if load_state_is_loaded(self._client.get_load_state(collection_name=collection_name, timeout=5)):
                    raise RuntimeError(f"Milvus collection remained loaded after release: {collection_name}")
                counters["released"] += 1
                self._redis.zrem(LAST_ACCESS_KEY, collection_name)
                logger.info("Released idle Milvus collection: %s", collection_name)
        except Exception:
            counters["failed"] += 1
            # Move it beyond this run's fixed cutoff; it becomes eligible again the next night.
            self._redis.zadd(
                LAST_ACCESS_KEY,
                {collection_name: cutoff + FAILED_RELEASE_RETRY_SECONDS},
            )
            logger.exception("Failed to release idle Milvus collection: %s", collection_name)
