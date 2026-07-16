from pydantic import Field
from pydantic_settings import BaseSettings


class TeachingPlatformConfig(BaseSettings):
    """Compatibility settings for the existing teaching-platform integration.

    Defaults intentionally match the Dify 1.0.1 customization so the teaching
    platform can migrate without changing its URLs, payloads, or shared student
    password. Deployments may override them through environment variables.
    """

    TEACHING_MODE_ENABLED: bool = Field(
        description="Enable teaching-platform account, usage, file, and UI compatibility features.",
        default=True,
    )
    TEACHING_DEFAULT_PASSWORD: str = Field(
        description="Shared password used by the legacy email-based automatic login flow.",
        default="Ydt@12345",
    )
    TEACHING_TENANT_ID: str = Field(
        description="Workspace that automatically provisioned students join as editors.",
        default="6169e57c-065f-4170-8411-d13b1363ad3f",
    )
    TEACHING_CONSOLE_URL: str = Field(
        description="Public Dify console URL used by the legacy provisioning redirect.",
        default="https://znt.suitanglian.com",
    )
    TEACHING_TOKEN_REPORT_URL: str = Field(
        description="Existing teaching-platform endpoint that accumulates agent token usage.",
        default="https://www.suitanglian.com:3019/api/setAgentTokens",
    )
    TEACHING_FILE_API_URL: str = Field(
        description="Existing teaching-platform unified utility endpoint used to list student files.",
        default="https://www.suitanglian.com:3019/api/ai_general_education/unifiedUtilFunction_PPT",
    )
    TEACHING_REQUEST_TIMEOUT_SECONDS: float = Field(
        description="Timeout for outbound teaching-platform HTTP requests.",
        default=10.0,
        gt=0,
    )
    TEACHING_LOGIN_TICKET_TTL_SECONDS: int = Field(
        description="Lifetime of a one-time student iframe login ticket stored in Redis.",
        default=60,
        ge=15,
        le=300,
    )
    TEACHING_PRESERVE_DATASET_SOURCE_FILES: bool = Field(
        description="Keep course-platform source uploads when a knowledge document or dataset is deleted.",
        default=True,
    )
    TEACHING_IFRAME_COOKIE_SAMESITE_NONE: bool = Field(
        description="Deprecated: student iframe authentication now uses Bearer tokens instead of third-party cookies.",
        default=False,
    )
