import logging

from pymilvus import MilvusClient  # type: ignore

import app
from configs import dify_config
from dify_vdb_milvus.collection_lifecycle import MilvusIdleCollectionReleaser, RUN_LOCK_KEY
from extensions.ext_redis import redis_client

logger = logging.getLogger(__name__)


@app.celery.task(queue="dataset")
def release_idle_milvus_collections_task() -> None:
    if not dify_config.MILVUS_ENABLE_IDLE_COLLECTION_RELEASE or dify_config.VECTOR_STORE != "milvus":
        return

    run_lock = redis_client.lock(RUN_LOCK_KEY, timeout=4 * 60 * 60, blocking=False)
    if not run_lock.acquire(blocking=False):
        logger.info("Milvus idle collection release is already running")
        return

    try:
        client_kwargs = {
            "uri": dify_config.MILVUS_URI,
            "db_name": dify_config.MILVUS_DATABASE or "default",
        }
        if dify_config.MILVUS_TOKEN:
            client_kwargs["token"] = dify_config.MILVUS_TOKEN
        else:
            client_kwargs["user"] = dify_config.MILVUS_USER or ""
            client_kwargs["password"] = dify_config.MILVUS_PASSWORD or ""

        releaser = MilvusIdleCollectionReleaser(
            client=MilvusClient(**client_kwargs),
            idle_seconds=dify_config.MILVUS_IDLE_COLLECTION_RELEASE_DAYS * 24 * 60 * 60,
            batch_size=dify_config.MILVUS_IDLE_COLLECTION_RELEASE_BATCH_SIZE,
        )
        result = releaser.run()
        logger.info(
            "Milvus idle collection release finished: initialized=%s examined=%s released=%s "
            "already_unloaded=%s deferred_active=%s failed=%s",
            result.initialized,
            result.examined,
            result.released,
            result.already_unloaded,
            result.deferred_active,
            result.failed,
        )
    finally:
        try:
            run_lock.release()
        except Exception:
            logger.exception("Failed to release Milvus idle collection task lock")
