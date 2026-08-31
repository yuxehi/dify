from typing import cast
from unittest.mock import MagicMock

import pytest
from flask import Request
from werkzeug.wrappers import Response

from constants import COOKIE_NAME_ACCESS_TOKEN, COOKIE_NAME_WEBAPP_ACCESS_TOKEN
from libs import token
from libs.token import extract_access_token, extract_webapp_access_token, set_csrf_token_to_cookie


class MockRequest:
    def __init__(self, headers: dict[str, str], cookies: dict[str, str], args: dict[str, str]):
        self.headers: dict[str, str] = headers
        self.cookies: dict[str, str] = cookies
        self.args: dict[str, str] = args


def test_extract_access_token():
    def _mock_request(headers: dict[str, str], cookies: dict[str, str], args: dict[str, str]) -> Request:
        return cast(Request, MockRequest(headers, cookies, args))

    test_cases = [
        (_mock_request({"Authorization": "Bearer 123"}, {}, {}), "123", "123"),
        (_mock_request({}, {COOKIE_NAME_ACCESS_TOKEN: "123"}, {}), "123", None),
        (_mock_request({}, {}, {}), None, None),
        (_mock_request({"Authorization": "Bearer_aaa 123"}, {}, {}), None, None),
        (_mock_request({}, {COOKIE_NAME_WEBAPP_ACCESS_TOKEN: "123"}, {}), None, "123"),
    ]
    for request, expected_console, expected_webapp in test_cases:
        assert extract_access_token(request) == expected_console
        assert extract_webapp_access_token(request) == expected_webapp


def test_real_cookie_name_uses_host_prefix_without_domain(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(token.dify_config, "CONSOLE_WEB_URL", "https://console.example.com", raising=False)
    monkeypatch.setattr(token.dify_config, "CONSOLE_API_URL", "https://api.example.com", raising=False)
    monkeypatch.setattr(token.dify_config, "COOKIE_DOMAIN", "", raising=False)

    assert token._real_cookie_name("csrf_token") == "__Host-csrf_token"


def test_real_cookie_name_without_host_prefix_when_domain_present(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(token.dify_config, "CONSOLE_WEB_URL", "https://console.example.com", raising=False)
    monkeypatch.setattr(token.dify_config, "CONSOLE_API_URL", "https://api.example.com", raising=False)
    monkeypatch.setattr(token.dify_config, "COOKIE_DOMAIN", ".example.com", raising=False)

    assert token._real_cookie_name("csrf_token") == "csrf_token"


def test_set_csrf_cookie_includes_domain_when_configured(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(token.dify_config, "CONSOLE_WEB_URL", "https://console.example.com", raising=False)
    monkeypatch.setattr(token.dify_config, "CONSOLE_API_URL", "https://api.example.com", raising=False)
    monkeypatch.setattr(token.dify_config, "COOKIE_DOMAIN", ".example.com", raising=False)

    response = Response()
    request = MagicMock()

    set_csrf_token_to_cookie(request, response, "abc123")

    cookies = response.headers.getlist("Set-Cookie")
    assert any("csrf_token=abc123" in c for c in cookies)
    assert any("Domain=example.com" in c for c in cookies)
    assert all("__Host-" not in c for c in cookies)


def test_console_cookie_keeps_lax_in_teaching_mode(monkeypatch: pytest.MonkeyPatch):
    """Administrator cookies stay first-party; students use Bearer tokens."""
    monkeypatch.setattr(token.dify_config, "TEACHING_MODE_ENABLED", True, raising=False)
    monkeypatch.setattr(token.dify_config, "CONSOLE_WEB_URL", "https://console.example.com", raising=False)
    monkeypatch.setattr(token.dify_config, "CONSOLE_API_URL", "https://api.example.com", raising=False)

    assert token._console_cookie_samesite(None) == "Lax"
    # Explicit call-site choices must continue to take precedence.
    assert token._console_cookie_samesite("Strict") == "Strict"


def test_console_cookie_keeps_upstream_lax_outside_teaching_mode(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(token.dify_config, "TEACHING_MODE_ENABLED", False, raising=False)

    assert token._console_cookie_samesite(None) == "Lax"


def test_console_bearer_request_requires_header_without_console_cookie():
    bearer_request = cast(Request, MockRequest({"Authorization": "Bearer abc"}, {}, {}))
    mixed_request = cast(
        Request,
        MockRequest({"Authorization": "Bearer abc"}, {COOKIE_NAME_ACCESS_TOKEN: "cookie-token"}, {}),
    )

    assert token.is_console_bearer_request(bearer_request) is True
    assert token.is_console_bearer_request(mixed_request) is False


def test_bearer_request_bypasses_cookie_csrf(monkeypatch: pytest.MonkeyPatch):
    request = cast(Request, MockRequest({"Authorization": "Bearer abc"}, {}, {}))
    monkeypatch.setattr(token.dify_config, "ADMIN_API_KEY_ENABLE", False, raising=False)

    token.check_csrf_token(request, "student-id")
