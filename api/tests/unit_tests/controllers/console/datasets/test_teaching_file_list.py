from unittest.mock import MagicMock

import pytest

from libs.teaching_file_access import resolve_teaching_file_email_filter


def test_student_file_filter_is_limited_to_signed_in_email():
    account = MagicMock(email="student@example.com", is_admin_or_owner=False)

    assert (
        resolve_teaching_file_email_filter(
            account=account,
            requested_email="student@example.com",
        )
        == "student@example.com"
    )

    with pytest.raises(PermissionError):
        resolve_teaching_file_email_filter(
            account=account,
            requested_email="other@example.com",
        )


def test_administrator_is_also_limited_to_their_own_email():
    administrator = MagicMock(email="admin@example.com", is_admin_or_owner=True)

    assert (
        resolve_teaching_file_email_filter(account=administrator, requested_email="admin@example.com")
        == "admin@example.com"
    )

    with pytest.raises(PermissionError):
        resolve_teaching_file_email_filter(
            account=administrator,
            requested_email="student@example.com",
        )
