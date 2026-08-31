from pydantic import Field, PositiveInt
from pydantic_settings import BaseSettings


class MilvusConfig(BaseSettings):
    """
    Configuration settings for Milvus vector database
    """

    MILVUS_URI: str | None = Field(
        description="URI for connecting to the Milvus server (e.g., 'http://localhost:19530' or 'https://milvus-instance.example.com:19530')",
        default="http://127.0.0.1:19530",
    )

    MILVUS_TOKEN: str | None = Field(
        description="Authentication token for Milvus, if token-based authentication is enabled",
        default=None,
    )
    MILVUS_USER: str | None = Field(
        description="Username for authenticating with Milvus, if username/password authentication is enabled",
        default=None,
    )

    MILVUS_PASSWORD: str | None = Field(
        description="Password for authenticating with Milvus, if username/password authentication is enabled",
        default=None,
    )

    MILVUS_DATABASE: str = Field(
        description="Name of the Milvus database to connect to (default is 'default')",
        default="default",
    )

    MILVUS_ENABLE_HYBRID_SEARCH: bool = Field(
        description="Enable hybrid search features (requires Milvus >= 2.5.0). Set to false for compatibility with "
        "older versions",
        default=True,
    )

    MILVUS_ANALYZER_PARAMS: str | None = Field(
        description='Milvus text analyzer parameters, e.g., {"type": "chinese"} for Chinese segmentation support.',
        default=None,
    )

    MILVUS_ENABLE_IDLE_COLLECTION_RELEASE: bool = Field(
        description="Release Milvus collections that have not been accessed within the configured idle period",
        default=True,
    )

    MILVUS_IDLE_COLLECTION_RELEASE_DAYS: PositiveInt = Field(
        description="Number of idle days before a loaded Milvus collection is eligible for release",
        default=30,
    )

    MILVUS_IDLE_COLLECTION_RELEASE_BATCH_SIZE: PositiveInt = Field(
        description="Number of idle Milvus collections processed per throttled batch within one nightly run",
        default=20,
    )

    MILVUS_IDLE_COLLECTION_RELEASE_HOUR: int = Field(
        description="Local hour when the daily Milvus idle collection release task starts",
        default=23,
        ge=0,
        le=23,
    )

    MILVUS_IDLE_COLLECTION_RELEASE_MINUTE: int = Field(
        description="Local minute when the daily Milvus idle collection release task starts",
        default=0,
        ge=0,
        le=59,
    )

    MILVUS_IDLE_COLLECTION_RELEASE_TIMEZONE: str = Field(
        description="IANA timezone used to interpret the configured Milvus idle collection release time",
        default="Asia/Shanghai",
    )
