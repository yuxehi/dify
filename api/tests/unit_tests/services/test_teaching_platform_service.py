from unittest.mock import MagicMock

import pytest

from services import teaching_platform_service as module
from services.teaching_platform_service import TeachingPlatformService


def test_issue_student_login_ticket(monkeypatch):
    account = MagicMock()
    account.id = "student-id"
    setex = MagicMock()
    monkeypatch.setattr("services.teaching_platform_service.secrets.token_urlsafe", lambda _: "ticket-value")
    monkeypatch.setattr("services.teaching_platform_service.redis_client.setex", setex)
    monkeypatch.setattr(
        "services.teaching_platform_service.dify_config.TEACHING_LOGIN_TICKET_TTL_SECONDS",
        60,
        raising=False,
    )

    ticket = TeachingPlatformService.issue_student_login_ticket(account)

    assert ticket == "ticket-value"
    setex.assert_called_once_with("teaching_login_ticket:ticket-value", 60, "student-id")


def test_provision_student_never_demotes_privileged_account(monkeypatch):
    account = MagicMock()
    tenant = MagicMock()
    create_member = MagicMock()
    monkeypatch.setattr(module.db.session, "scalar", lambda statement: account)
    monkeypatch.setattr(module.db.session, "get", lambda model, tenant_id: tenant)
    monkeypatch.setattr(module.TenantService, "get_user_role", lambda account, tenant: module.TenantAccountRole.OWNER)
    monkeypatch.setattr(module.TenantService, "create_tenant_member", create_member)

    with pytest.raises(PermissionError):
        TeachingPlatformService.provision_student(name="Admin", email="admin@example.com")

    create_member.assert_not_called()


def test_consume_student_login_ticket_is_single_use(monkeypatch):
    getdel = MagicMock(return_value=b"student-id")
    account = MagicMock()
    load_user = MagicMock(return_value=account)
    monkeypatch.setattr("services.teaching_platform_service.redis_client.getdel", getdel)
    monkeypatch.setattr("services.teaching_platform_service.AccountService.load_user", load_user)
    monkeypatch.setattr(module.db.session, "get", lambda model, tenant_id: object())
    monkeypatch.setattr(module.TenantService, "get_user_role", lambda account, tenant: module.TenantAccountRole.EDITOR)

    result = TeachingPlatformService.consume_student_login_ticket("ticket-value")

    assert result is account
    getdel.assert_called_once_with("teaching_login_ticket:ticket-value")
    load_user.assert_called_once_with("student-id")


def test_consume_missing_student_login_ticket(monkeypatch):
    monkeypatch.setattr("services.teaching_platform_service.redis_client.getdel", MagicMock(return_value=None))

    assert TeachingPlatformService.consume_student_login_ticket("expired-ticket") is None


def test_consume_ticket_rejects_account_promoted_to_admin(monkeypatch):
    account = MagicMock()
    monkeypatch.setattr(module.redis_client, "getdel", MagicMock(return_value=b"student-id"))
    monkeypatch.setattr(module.AccountService, "load_user", MagicMock(return_value=account))
    monkeypatch.setattr(module.db.session, "get", lambda model, tenant_id: object())
    monkeypatch.setattr(module.TenantService, "get_user_role", lambda account, tenant: module.TenantAccountRole.ADMIN)

    assert TeachingPlatformService.consume_student_login_ticket("ticket-value") is None
