from typing import Protocol


class TeachingFileAccount(Protocol):
    """Minimum account attributes needed to authorize a teaching-file request."""

    email: str


def resolve_teaching_file_email_filter(*, account: TeachingFileAccount, requested_email: str) -> str:
    """Keep the 1.0.1 current-account behavior without its email spoofing risk."""
    if not requested_email or requested_email != account.email.lower():
        raise PermissionError("The email does not match the signed-in account.")
    return requested_email
