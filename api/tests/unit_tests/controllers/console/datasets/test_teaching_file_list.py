from unittest.mock import MagicMock

import pytest

from libs.teaching_file_access import resolve_teaching_file_email_filter


def test_student_file_filter_is_limited_to_signed_in_email():
    account = MagicMock(email="student@example.com", is_admin_or_owner=False)

    assert (
        resolve_teaching_file_email_filter(
            account=account,
            requested_email="student@example.com",
            scope="self",
        )
        == "student@example.com"
    )

    with pytest.raises(PermissionError):
        resolve_teaching_file_email_filter(
            account=account,
            requested_email="other@example.com",
            scope="self",
        )


def test_only_administrator_can_remove_the_teaching_file_email_filter():
    student = MagicMock(email="student@example.com", is_admin_or_owner=False)
    administrator = MagicMock(email="admin@example.com", is_admin_or_owner=True)

    with pytest.raises(PermissionError):
        resolve_teaching_file_email_filter(account=student, requested_email="", scope="all")

    assert resolve_teaching_file_email_filter(account=administrator, requested_email="", scope="all") == ""
