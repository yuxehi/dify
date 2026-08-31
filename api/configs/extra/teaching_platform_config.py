from typing import ClassVar

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class TeachingPlatformConfig(BaseSettings):
    """Compatibility settings for the existing teaching-platform integration.

    Deployment-specific hosts are configured once as base URLs. Endpoint paths
    remain frozen integration contracts, so changing a domain, IP address,
    scheme, or port never requires editing application code.
    """

    TEACHING_TOKEN_REPORT_PATH: ClassVar[str] = "/api/setAgentTokens"
    TEACHING_FILE_API_PATH: ClassVar[str] = "/api/ai_general_education/unifiedUtilFunction_PPT"

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
    DIFY_PUBLIC_BASE_URL: str = Field(
        description="Public Dify origin used by the legacy provisioning redirect.",
        default="http://localhost",
    )
    TEACHING_PLATFORM_BASE_URL: str = Field(
        description="Teaching-platform origin used for all outbound integration requests.",
        default="http://localhost:3019",
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

    @field_validator("DIFY_PUBLIC_BASE_URL", "TEACHING_PLATFORM_BASE_URL")
    @classmethod
    def normalize_http_base_url(cls, value: str) -> str:
        """Accept domains or IP addresses while requiring an explicit scheme."""
        normalized = value.strip().rstrip("/")
        if not normalized.startswith(("http://", "https://")):
            raise ValueError("base URL must start with http:// or https://")
        return normalized

    @property
    def teaching_token_report_url(self) -> str:
        return f"{self.TEACHING_PLATFORM_BASE_URL}{self.TEACHING_TOKEN_REPORT_PATH}"

    @property
    def teaching_file_api_url(self) -> str:
        return f"{self.TEACHING_PLATFORM_BASE_URL}{self.TEACHING_FILE_API_PATH}"
