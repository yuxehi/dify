import logging

import requests
from celery import shared_task
from sqlalchemy import select

from configs import dify_config
from core.db.session_factory import session_factory
from extensions.ext_redis import redis_client
from models import Account, App

logger = logging.getLogger(__name__)

_PROCESSING_TTL_SECONDS = 60 * 10
_REPORTED_TTL_SECONDS = 60 * 60 * 24 * 30


@shared_task(queue="ops_trace", bind=True, max_retries=3, default_retry_delay=30)
def report_teaching_token_usage_task(
    self,
    *,
    app_id: str,
    total_tokens: int,
    event_type: str,
    event_id: str,
) -> bool:
    """Report usage without blocking Dify's message/workflow completion path.

    The external URL and JSON keys are a frozen teaching-platform contract. The
    event metadata is used only inside Dify for deduplication and is deliberately
    not added to the outbound body, because the existing platform accepts exactly
    ``email`` and ``total_tokens``.
    """
    if not dify_config.TEACHING_MODE_ENABLED or total_tokens <= 0:
        return True

    idempotency_key = f"teaching:token-report:{event_type}:{event_id}"
    # A short processing lease allows recovery if a worker is terminated after
    # acquiring the key. Successful reports retain the longer deduplication TTL.
    if not redis_client.set(idempotency_key, "processing", nx=True, ex=_PROCESSING_TTL_SECONDS):
        logger.info("Teaching token usage already reported or in progress: %s", idempotency_key)
        return True

    try:
        with session_factory.create_session() as session:
            row = session.execute(
                select(Account.email)
                .join(App, App.created_by == Account.id)
                .where(App.id == app_id)
                .limit(1)
            ).first()
        if row is None:
            logger.warning("Skip teaching token report because app creator was not found: app_id=%s", app_id)
            redis_client.delete(idempotency_key)
            return False

        response = requests.post(
            dify_config.teaching_token_report_url,
            json={"email": row.email, "total_tokens": int(total_tokens)},
            timeout=dify_config.TEACHING_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        redis_client.set(idempotency_key, "reported", ex=_REPORTED_TTL_SECONDS)
        logger.info(
            "Reported teaching token usage: app_id=%s event_type=%s event_id=%s total_tokens=%s",
            app_id,
            event_type,
            event_id,
            total_tokens,
        )
        return True
    except Exception as exc:
        # Delete the processing marker so the Celery retry can acquire it again.
        redis_client.delete(idempotency_key)
        logger.exception(
            "Failed to report teaching token usage: app_id=%s event_type=%s event_id=%s",
            app_id,
            event_type,
            event_id,
        )
        raise self.retry(exc=exc, countdown=30 * (2**self.request.retries))
