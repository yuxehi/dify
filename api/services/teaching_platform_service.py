import secrets

from sqlalchemy import func, select

from configs import dify_config
from extensions.ext_database import db
from extensions.ext_redis import redis_client
from models import Account, Tenant, TenantAccountRole
from services.account_service import AccountService, TenantService


class TeachingPlatformService:
    """Bridge the legacy teaching-platform account contract to current Dify services.

    Keep this integration in one service instead of spreading tenant IDs and the
    shared password through controllers. This is deliberately compatibility-first:
    the external platform continues to call ``/apps/user?name=...&email=...``.
    """

    _LOGIN_TICKET_KEY_PREFIX = "teaching_login_ticket:"

    @staticmethod
    def provision_student(*, name: str, email: str) -> Account:
        normalized_email = email.strip().lower()
        account = db.session.scalar(
            select(Account).where(func.lower(Account.email) == normalized_email).limit(1)
        )

        if account is None:
            # is_setup=True bypasses public-registration switches. This endpoint is
            # the same trusted provisioning entry used by the teaching platform in
            # the 1.0.1 customization, and must work when registration is disabled.
            account = AccountService.create_account(
                email=normalized_email,
                name=name.strip(),
                interface_language="zh-Hans",
                password=dify_config.TEACHING_DEFAULT_PASSWORD,
                interface_theme="light",
                is_setup=True,
                timezone="Asia/Shanghai",
            )

        tenant = db.session.get(Tenant, dify_config.TEACHING_TENANT_ID)
        if tenant is None:
            raise ValueError(
                "Teaching tenant does not exist. Check TEACHING_TENANT_ID before provisioning students."
            )

        existing_role = TenantService.get_user_role(account, tenant)
        if TenantAccountRole.is_privileged_role(existing_role):
            # The legacy endpoint is intentionally unauthenticated so the
            # teaching platform can enter it directly. Never let that endpoint
            # overwrite an Owner/Admin membership or mint an iframe login for it.
            raise PermissionError("Privileged Dify accounts cannot use the student login entry.")

        # Re-applying membership is intentional: it repairs accounts that existed
        # before the teaching integration but were not linked to the teaching tenant.
        # Privileged roles were rejected above, so this cannot demote an admin.
        TenantService.create_tenant_member(tenant, account, role=TenantAccountRole.EDITOR)
        TenantService.switch_tenant(account, tenant.id)
        return account

    @classmethod
    def issue_student_login_ticket(cls, account: Account) -> str:
        """Create a short-lived, single-use ticket for the cross-site iframe.

        Only the opaque random ticket is placed in the redirect URL. Long-lived
        access/refresh tokens are returned later by a same-origin POST from the
        Dify iframe, so they never appear in browser history or referrer headers.
        """
        ticket = secrets.token_urlsafe(32)
        redis_client.setex(
            f"{cls._LOGIN_TICKET_KEY_PREFIX}{ticket}",
            dify_config.TEACHING_LOGIN_TICKET_TTL_SECONDS,
            str(account.id),
        )
        return ticket

    @classmethod
    def consume_student_login_ticket(cls, ticket: str) -> Account | None:
        """Atomically consume a ticket and resolve its still-eligible student."""
        account_id = redis_client.getdel(f"{cls._LOGIN_TICKET_KEY_PREFIX}{ticket}")
        if not account_id:
            return None
        if isinstance(account_id, bytes):
            account_id = account_id.decode("utf-8")
        account = AccountService.load_user(str(account_id))
        if account is None:
            return None

        tenant = db.session.get(Tenant, dify_config.TEACHING_TENANT_ID)
        if tenant is None or TenantService.get_user_role(account, tenant) != TenantAccountRole.EDITOR:
            # Membership may have changed during the ticket TTL. Consume the
            # ticket but do not create a student session for a promoted account.
            return None
        return account
