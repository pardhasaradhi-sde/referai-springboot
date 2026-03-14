"""Document extraction request/response schemas."""

from __future__ import annotations

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class ExtractResumeRequest(BaseModel):
    """Request to extract text from resume file."""

    model_config = ConfigDict(populate_by_name=True)

    file_content: str = Field(
        ...,
        validation_alias=AliasChoices("file_content", "fileContent"),
        serialization_alias="fileContent",
        description="Base64 encoded file content",
    )
    file_name: str = Field(
        ...,
        validation_alias=AliasChoices("file_name", "fileName"),
        serialization_alias="fileName",
        description="Original filename with extension",
    )


class ExtractResumeResponse(BaseModel):
    """Response from resume text extraction."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool
    text: str | None = None
    word_count: int | None = Field(
        default=None,
        validation_alias=AliasChoices("word_count", "wordCount"),
        serialization_alias="wordCount",
    )
    page_count: int | None = Field(
        default=None,
        validation_alias=AliasChoices("page_count", "pageCount"),
        serialization_alias="pageCount",
    )
    extraction_method: str | None = Field(
        default=None,
        validation_alias=AliasChoices("extraction_method", "extractionMethod"),
        serialization_alias="extractionMethod",
    )
    error: str | None = None
    supported_types: list[str] | None = Field(
        default=None,
        validation_alias=AliasChoices("supported_types", "supportedTypes"),
        serialization_alias="supportedTypes",
    )


class ScrapeJobRequest(BaseModel):
    """Request to scrape job description from URL."""

    url: str = Field(..., description="Job posting URL")


class ScrapeJobResponse(BaseModel):
    """Response from job description scraping."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool
    source: str | None = None
    job_title: str | None = Field(
        default=None,
        validation_alias=AliasChoices("job_title", "jobTitle"),
        serialization_alias="jobTitle",
    )
    company: str | None = None
    location: str | None = None
    description: str | None = None
    requirements: list[str] | None = None
    scraped_at: str | None = Field(
        default=None,
        validation_alias=AliasChoices("scraped_at", "scrapedAt"),
        serialization_alias="scrapedAt",
    )
    error: str | None = None
    fallback_message: str | None = Field(
        default=None,
        validation_alias=AliasChoices("fallback_message", "fallbackMessage"),
        serialization_alias="fallbackMessage",
    )
