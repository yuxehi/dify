import pytest
from pydantic import ValidationError

from configs.extra.teaching_platform_config import TeachingPlatformConfig


def test_base_urls_are_normalized_and_endpoints_are_derived() -> None:
    config = TeachingPlatformConfig(
        DIFY_PUBLIC_BASE_URL=" http://192.0.2.10:8080/ ",
        TEACHING_PLATFORM_BASE_URL="https://198.51.100.20:3019/",
    )

    assert config.DIFY_PUBLIC_BASE_URL == "http://192.0.2.10:8080"
    assert config.TEACHING_PLATFORM_BASE_URL == "https://198.51.100.20:3019"
    assert config.teaching_token_report_url == "https://198.51.100.20:3019/api/setAgentTokens"
    assert (
        config.teaching_file_api_url
        == "https://198.51.100.20:3019/api/ai_general_education/unifiedUtilFunction_PPT"
    )


def test_base_urls_require_an_explicit_http_scheme() -> None:
    with pytest.raises(ValidationError, match="base URL must start with http:// or https://"):
        TeachingPlatformConfig(TEACHING_PLATFORM_BASE_URL="198.51.100.20:3019")
