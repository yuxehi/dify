import logging

import requests
from flask import request
from flask_restful import Resource  # type: ignore

from controllers.console import api
from controllers.console.wraps import account_initialization_required, setup_required
from libs.login import login_required

logger = logging.getLogger(__name__)

class FileListApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        email = request.args.get("email", type=str, default="")
        # 外部 POST 接口地址
        url = 'https://www.suitanglian.com:3019/api/ai_general_education/unifiedUtilFunction_PPT'
        # 请求体
        payload = {"funcName":"GetFileList", "options":{"email": email}}
        try:
            resp = requests.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

            return data, resp.status_code
        except requests.RequestException as e:
            logger.info("外部请求失败：%s", e)
            logger.info("请求体为：%s", payload)
            return {"error": str(e)}, 500


api.add_resource(FileListApi, "/fileList")
