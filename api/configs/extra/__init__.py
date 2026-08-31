from configs.extra.archive_config import ArchiveStorageConfig
from configs.extra.notion_config import NotionConfig
from configs.extra.sentry_config import SentryConfig
from configs.extra.teaching_platform_config import TeachingPlatformConfig


class ExtraServiceConfig(
    # place the configs in alphabet order
    ArchiveStorageConfig,
    NotionConfig,
    SentryConfig,
    TeachingPlatformConfig,
):
    pass
