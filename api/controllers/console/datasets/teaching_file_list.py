import logging

import requests
from flask import request
from flask_restx import Resource

from configs import dify_config
from controllers.console import console_ns
from controllers.console.wraps import account_initialization_required, setup_required
from libs.login import current_account_with_tenant, login_required

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

        # A student may only request their own platform files. The query parameter
        # is retained solely for compatibility with the 1.0.1 web client contract.
        if not requested_email or requested_email != account.email.lower():
            return {"message": "The email does not match the signed-in account."}, 403

        payload = {"funcName": "GetFileList", "options": {"email": requested_email}}
        try:
            response = requests.post(
                dify_config.TEACHING_FILE_API_URL,
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
