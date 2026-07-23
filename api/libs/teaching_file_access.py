from typing import Protocol


class TeachingFileAccount(Protocol):
    """Minimum account attributes needed to authorize teaching-file scope."""

    email: str

    @property
    def is_admin_or_owner(self) -> bool: ...


def resolve_teaching_file_email_filter(*, account: TeachingFileAccount, requested_email: str, scope: str) -> str:
    """Resolve the legacy upstream email filter without widening student access."""
    if scope == "all":
        if not account.is_admin_or_owner:
            raise PermissionError("Only workspace administrators can load all teaching files.")
        # The legacy teaching-platform function interprets an empty email as
        # no task-owner filter, returning existing files from all tasks.
        return ""

    if not requested_email or requested_email != account.email.lower():
        raise PermissionError("The email does not match the signed-in account.")
    return requested_email
