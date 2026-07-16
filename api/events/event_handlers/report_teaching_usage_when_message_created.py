from configs import dify_config
from events.message_event import message_was_created
from models import Message
from tasks.report_teaching_token_usage_task import report_teaching_token_usage_task


@message_was_created.connect
def handle(sender: Message, **kwargs):
    """Queue the legacy teaching-platform token callback for message apps."""
    if not dify_config.TEACHING_MODE_ENABLED:
        return

    total_tokens = int(sender.message_tokens or 0) + int(sender.answer_tokens or 0)
    if total_tokens <= 0:
        return

    report_teaching_token_usage_task.delay(
        app_id=str(sender.app_id),
        total_tokens=total_tokens,
        event_type="message",
        event_id=str(sender.id),
    )
