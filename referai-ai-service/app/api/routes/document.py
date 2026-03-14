"""Document extraction and scraping endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.logging import get_logger
from app.schemas.document import (
    ExtractResumeRequest,
    ExtractResumeResponse,
    ScrapeJobRequest,
    ScrapeJobResponse,
)
from app.services.document_extractor import DocumentExtractor
from app.services.job_scraper import JobScraper

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["document"])


@router.post("/extract-resume", response_model=ExtractResumeResponse)
async def extract_resume(request: ExtractResumeRequest) -> ExtractResumeResponse:
    """
    Extract text from PDF or DOCX resume file.

    This endpoint is called by the Java backend after a user uploads their resume.
    """
    logger.info(
        "extract_resume.start",
        file_name=request.file_name,
        content_length=len(request.file_content),
    )

    success, text, word_count, page_count, method, error = DocumentExtractor.extract_text(
        request.file_content, request.file_name
    )

    if not success:
        logger.warning("extract_resume.failed", error=error)
        return ExtractResumeResponse(
            success=False,
            error=error,
            supported_types=["pdf", "docx"],
        )

    logger.info(
        "extract_resume.success",
        word_count=word_count,
        page_count=page_count,
        method=method,
    )

    return ExtractResumeResponse(
        success=True,
        text=text,
        word_count=word_count,
        page_count=page_count,
        extraction_method=method,
    )


@router.post("/scrape-jd", response_model=ScrapeJobResponse)
async def scrape_job_description(request: ScrapeJobRequest) -> ScrapeJobResponse:
    """
    Scrape job description from a URL.

    Uses board-specific parsers when available and a generic fallback
    for company career pages and other job sites.
    """
    logger.info("scrape_jd.start", url=request.url)

    success, data, error = await JobScraper.scrape(request.url)

    if not success:
        logger.warning("scrape_jd.failed", url=request.url, error=error)
        return ScrapeJobResponse(
            success=False,
            error=error,
            fallback_message="Please copy and paste the job description manually",
        )

    logger.info(
        "scrape_jd.success",
        source=data.get("source"),
        title=data.get("job_title"),
    )

    return ScrapeJobResponse(
        success=True,
        source=data.get("source"),
        job_title=data.get("job_title"),
        company=data.get("company"),
        location=data.get("location"),
        description=data.get("description"),
        requirements=data.get("requirements"),
        scraped_at=data.get("scraped_at"),
    )
