import pytest
from pydantic import ValidationError

from controllers.console.auth.login import EmailCodeLoginPayload, EmailPayload, LoginPayload
from services.entities.auth_entities import ForgotPasswordSendPayload, LoginPayloadBase


@pytest.mark.parametrize(
    ("identifier", "expected"),
    [
        ("13800000000", "13800000000"),
        ("18612345678", "18612345678"),
        (" 13800000000 ", "13800000000"),
        ("Owner@Example.com", "Owner@Example.com"),
        (" owner@example.com ", "owner@example.com"),
    ],
)
def test_console_password_login_accepts_phone_or_email(identifier: str, expected: str):
    payload = LoginPayload.model_validate({"email": identifier, "password": "test-password"})
    assert payload.email == expected
    assert payload.remember_me is False


@pytest.mark.parametrize("identifier", ["", " ", "admin", "12345678901", "1380000000", "138000000000", "1380000000a"])
def test_console_password_login_rejects_invalid_identifier(identifier: str):
    with pytest.raises(ValidationError):
        LoginPayload.model_validate({"email": identifier, "password": "test-password"})


def test_console_password_login_preserves_invitation_and_remember_me():
    payload = LoginPayload.model_validate(
        {"email": "admin@example.com", "password": "test-password", "remember_me": True, "invite_token": "invite"}
    )
    assert payload.remember_me is True
    assert payload.invite_token == "invite"


@pytest.mark.parametrize("model", [EmailPayload, ForgotPasswordSendPayload, LoginPayloadBase])
def test_email_based_flows_keep_email_validation(model):
    with pytest.raises(ValidationError):
        model.model_validate({"email": "13800000000", "password": "test-password"})


def test_email_code_login_does_not_accept_phone():
    with pytest.raises(ValidationError):
        EmailCodeLoginPayload.model_validate({"email": "13800000000", "code": "123456", "token": "token"})
