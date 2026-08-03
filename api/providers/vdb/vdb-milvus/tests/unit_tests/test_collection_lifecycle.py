from unittest.mock import MagicMock

import pytest

from dify_vdb_milvus import collection_lifecycle


def _lock() -> MagicMock:
    lock = MagicMock()
    lock.__enter__.return_value = None
    lock.__exit__.return_value = None
    return lock


def test_idle_releaser_processes_all_batches(monkeypatch: pytest.MonkeyPatch):
    redis = MagicMock()
    redis.exists.return_value = True
    redis.zrangebyscore.side_effect = [[b"collection_1", b"collection_2"], [b"collection_3"], []]
    redis.zscore.return_value = 0
    redis.zcard.return_value = 0
    redis.lock.return_value = _lock()

    client = MagicMock()
    client.has_collection.return_value = True
    released: set[str] = set()
    client.release_collection.side_effect = lambda collection_name, **_kwargs: released.add(collection_name)
    client.get_load_state.side_effect = lambda collection_name, **_kwargs: {
        "state": "NotLoad" if collection_name in released else "Loaded"
    }
    monkeypatch.setattr(collection_lifecycle.time, "sleep", MagicMock())

    result = collection_lifecycle.MilvusIdleCollectionReleaser(
        client=client,
        idle_seconds=30 * 24 * 60 * 60,
        batch_size=2,
        redis=redis,
    ).run()

    assert result.examined == 3
    assert result.released == 3
    assert client.release_collection.call_count == 3
    collection_lifecycle.time.sleep.assert_called_once_with(1)


def test_idle_releaser_initializes_existing_collections_without_loading_them():
    redis = MagicMock()
    redis.exists.return_value = False
    redis.zrangebyscore.return_value = []
    client = MagicMock()
    client.list_collections.return_value = ["collection_1", "collection_2", "collection_3"]

    result = collection_lifecycle.MilvusIdleCollectionReleaser(
        client=client,
        idle_seconds=30 * 24 * 60 * 60,
        batch_size=2,
        redis=redis,
    ).run()

    assert result.initialized == 3
    assert redis.zadd.call_count == 2
    client.get_load_state.assert_not_called()
    client.release_collection.assert_not_called()


def test_idle_releaser_defers_collection_with_active_lease():
    redis = MagicMock()
    redis.exists.return_value = True
    redis.zrangebyscore.side_effect = [[b"collection_1"], []]
    redis.zscore.return_value = 0
    redis.zcard.return_value = 1
    redis.lock.return_value = _lock()
    client = MagicMock()

    result = collection_lifecycle.MilvusIdleCollectionReleaser(
        client=client,
        idle_seconds=30 * 24 * 60 * 60,
        batch_size=20,
        redis=redis,
    ).run()

    assert result.deferred_active == 1
    client.release_collection.assert_not_called()
    redis.zadd.assert_called()


def test_collection_activity_registers_and_closes_lease(monkeypatch: pytest.MonkeyPatch):
    redis = MagicMock()
    redis.lock.return_value = _lock()
    monkeypatch.setattr(collection_lifecycle, "redis_client", redis)
    monkeypatch.setattr(collection_lifecycle.time, "time", MagicMock(side_effect=[100.0, 101.0]))

    with collection_lifecycle.collection_activity("collection_1"):
        pass

    active_key = collection_lifecycle.collection_active_key("collection_1")
    active_calls = [call for call in redis.zadd.call_args_list if call.args[0] == active_key]
    assert len(active_calls) == 1
    token, expiry = next(iter(active_calls[0].args[1].items()))
    assert expiry == 100.0 + collection_lifecycle.ACTIVE_LEASE_SECONDS
    redis.zrem.assert_called_once_with(active_key, token)
