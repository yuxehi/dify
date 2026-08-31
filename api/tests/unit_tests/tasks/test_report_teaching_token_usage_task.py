from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import MagicMock

from tasks import report_teaching_token_usage_task as module


@contextmanager
def _fake_session():
    session = MagicMock()
    session.execute.return_value.first.return_value = SimpleNamespace(email="student@example.com")
    yield session


def test_task_uses_consumed_queue():
    assert module.report_teaching_token_usage_task.queue == "ops_trace"


def test_task_posts_frozen_payload_and_marks_reported(monkeypatch):
    redis_set = MagicMock(return_value=True)
    post = MagicMock()
    post.return_value.raise_for_status.return_value = None
    monkeypatch.setattr(module.dify_config, "TEACHING_MODE_ENABLED", True)
    monkeypatch.setattr(module.dify_config, "TEACHING_PLATFORM_BASE_URL", "https://teaching.invalid")
    monkeypatch.setattr(module.session_factory, "create_session", _fake_session)
    monkeypatch.setattr(module.redis_client, "set", redis_set)
    monkeypatch.setattr(module.requests, "post", post)

    result = module.report_teaching_token_usage_task.run(
        app_id="app-1", total_tokens=123, event_type="workflow", event_id="event-1"
    )

    assert result is True
    post.assert_called_once_with(
        "https://teaching.invalid/api/setAgentTokens",
        json={"email": "student@example.com", "total_tokens": 123},
        timeout=10.0,
    )
    assert redis_set.call_args_list == [
        (("teaching:token-report:workflow:event-1", "processing"), {"nx": True, "ex": 600}),
        (("teaching:token-report:workflow:event-1", "reported"), {"ex": 2_592_000}),
    ]


def test_task_skips_duplicate(monkeypatch):
    monkeypatch.setattr(module.dify_config, "TEACHING_MODE_ENABLED", True)
    monkeypatch.setattr(module.redis_client, "set", MagicMock(return_value=False))
    post = MagicMock()
    monkeypatch.setattr(module.requests, "post", post)

    result = module.report_teaching_token_usage_task.run(
        app_id="app-1", total_tokens=123, event_type="message", event_id="event-1"
    )

    assert result is True
    post.assert_not_called()
