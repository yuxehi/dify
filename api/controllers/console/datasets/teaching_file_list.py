import logging

import requests
from flask import request
from flask_restx import Resource

from configs import dify_config
from controllers.console import console_ns
from controllers.console.wraps import account_initialization_required, setup_required
from libs.login import current_account_with_tenant, login_required
from libs.teaching_file_access import resolve_teaching_file_email_filter

logger = logging.getLogger(__name__)


@console_ns.route("/fileList")
class TeachingFileListApi(Resource):
    """Proxy the teaching platform's existing student-file API.

    The camel-case route and the upstream request body are legacy integration
    contracts. Keep them unchanged so the teaching platform can migrate to this
    Dify version without deploying corresponding platform-side changes.
    """

    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        if not dify_config.TEACHING_MODE_ENABLED:
            return {"message": "Not found"}, 404

        account, _ = current_account_with_tenant()
        requested_email = request.args.get("email", type=str, default="").strip().lower()

        # Preserve the 1.0.1 behavior for every role: the chooser loads files
        # bound to the current account's email. Unlike 1.0.1, the API validates
        # that email so a crafted request cannot read another member's files.
        try:
            email_filter = resolve_teaching_file_email_filter(account=account, requested_email=requested_email)
        except PermissionError as exc:
            return {"message": str(exc)}, 403

        payload = {"funcName": "GetFileList", "options": {"email": email_filter}}
        try:
            response = requests.post(
                dify_config.teaching_file_api_url,
                json=payload,
                timeout=dify_config.TEACHING_REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            return response.json(), response.status_code
        except (requests.RequestException, ValueError) as exc:
            # Do not log the student's email or the upstream response body: both
            # may contain personal information. The exception still identifies
            # transport/status/JSON failures for operations troubleshooting.
            logger.warning("Teaching file-list request failed: %s", exc)
            return {"message": "Unable to load teaching-platform files."}, 502
