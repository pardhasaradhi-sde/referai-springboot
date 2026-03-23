"""Job description scraping service for job boards and generic career pages."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from bs4.element import Tag

from app.core.logging import get_logger

logger = get_logger(__name__)


class JobScraper:
    """Scrape job descriptions from known job boards and arbitrary websites."""

    TIMEOUT = 30  # seconds
    USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    MIN_DESCRIPTION_WORDS = 40
    DESCRIPTION_PREFERENCE_RATIO = 1.35
    DESCRIPTION_KEYWORDS = (
        "responsibilities",
        "requirements",
        "qualifications",
        "about the role",
        "what you'll do",
        "skills",
    )
    SECTION_KEYWORDS = (
        "about the role",
        "about this role",
        "job description",
        "responsibilities",
        "what you'll do",
        "what you will do",
        "requirements",
        "qualifications",
        "preferred qualifications",
        "minimum qualifications",
        "eligibility",
    )

    @staticmethod
    async def scrape(url: str) -> tuple[bool, dict | None, str | None]:
        """
        Scrape job description from URL.

        Returns:
            (success, data_dict, error_message)
        """
        try:
            domain = urlparse(url).netloc.lower()
            board_scraper = None

            if "linkedin.com" in domain:
                board_scraper = JobScraper._scrape_linkedin
            elif "indeed.com" in domain or "indeed.co.in" in domain:
                board_scraper = JobScraper._scrape_indeed
            elif "naukri.com" in domain:
                board_scraper = JobScraper._scrape_naukri
            elif "glassdoor.com" in domain or "glassdoor.co.in" in domain:
                board_scraper = JobScraper._scrape_glassdoor

            if board_scraper:
                success, data, error = await board_scraper(url)
                if success:
                    return success, data, error

                logger.info(
                    "job_scraper.board_fallback_generic",
                    domain=domain,
                    board_error=error,
                )
                return await JobScraper._scrape_generic(url, domain_hint=domain, previous_error=error)

            return await JobScraper._scrape_generic(url, domain_hint=domain)

        except Exception as e:
            logger.exception("job_scraper.failed", url=url, error=str(e))
            return False, None, f"Scraping failed: {str(e)}"

    @staticmethod
    async def _fetch_page(url: str) -> httpx.Response:
        headers = {
            "User-Agent": JobScraper.USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
        }
        async with httpx.AsyncClient(timeout=JobScraper.TIMEOUT) as client:
            return await client.get(url, headers=headers, follow_redirects=True)

    @staticmethod
    async def _scrape_generic(
        url: str,
        domain_hint: str | None = None,
        previous_error: str | None = None,
    ) -> tuple[bool, dict | None, str | None]:
        """Generic scraper that works for most company career pages and job URLs."""
        try:
            response = await JobScraper._fetch_page(url)
            if response.status_code != 200:
                return (
                    False,
                    None,
                    f"URL returned status {response.status_code}. Please paste the description manually.",
                )

            soup = BeautifulSoup(response.text, "lxml")

            job_data = JobScraper._extract_json_ld_job_posting(soup) or {}

            job_title = job_data.get("job_title") or JobScraper._extract_title(soup)
            company = job_data.get("company") or JobScraper._extract_company(soup)
            location = job_data.get("location") or JobScraper._extract_location(soup)
            json_ld_description = JobScraper._clean_text(job_data.get("description"))
            generic_description = JobScraper._clean_text(JobScraper._extract_description(soup))

            description = JobScraper._choose_best_description(json_ld_description, generic_description)

            description = JobScraper._clean_text(description)
            word_count = len(description.split()) if description else 0

            if not description or word_count < JobScraper.MIN_DESCRIPTION_WORDS:
                logger.warning(
                    "job_scraper.generic.insufficient_content",
                    source=JobScraper._normalize_source(domain_hint or urlparse(url).netloc.lower()),
                    word_count=word_count,
                    previous_error=previous_error,
                )
                return (
                    False,
                    None,
                    "Could not extract a full job description from this URL. Please copy and paste it manually.",
                )

            source = JobScraper._normalize_source(domain_hint or urlparse(url).netloc.lower())
            logger.info("job_scraper.generic.success", source=source, title=job_title, company=company)

            return (
                True,
                {
                    "source": source,
                    "job_title": job_title,
                    "company": company,
                    "location": location,
                    "description": description,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                },
                None,
            )
        except httpx.TimeoutException:
            return False, None, "Request timed out while scraping URL. Please try again or paste manually."
        except Exception as e:
            logger.exception("job_scraper.generic.failed", error=str(e))
            return False, None, f"Generic scraping failed: {str(e)}"

    @staticmethod
    def _extract_json_ld_job_posting(soup: BeautifulSoup) -> dict | None:
        scripts = soup.find_all("script", type=re.compile(r"ld\+json", re.IGNORECASE))
        for script in scripts:
            raw = script.string or script.get_text()
            if not raw:
                continue

            try:
                payload = json.loads(raw.strip())
            except json.JSONDecodeError:
                continue

            posting = JobScraper._find_job_posting(payload)
            if not posting:
                continue

            return {
                "job_title": JobScraper._clean_text(str(posting.get("title") or "")),
                "company": JobScraper._extract_company_from_json_ld(posting.get("hiringOrganization")),
                "location": JobScraper._extract_location_from_json_ld(
                    posting.get("jobLocation")
                    or posting.get("applicantLocationRequirements")
                    or posting.get("jobLocationType")
                ),
                "description": JobScraper._extract_text_from_html(posting.get("description")),
            }

        return None

    @staticmethod
    def _find_job_posting(payload: object) -> dict | None:
        if isinstance(payload, dict):
            if JobScraper._is_job_posting_type(payload.get("@type")):
                return payload

            graph = payload.get("@graph")
            if isinstance(graph, (list, dict)):
                result = JobScraper._find_job_posting(graph)
                if result:
                    return result

            for value in payload.values():
                if isinstance(value, (dict, list)):
                    result = JobScraper._find_job_posting(value)
                    if result:
                        return result

        if isinstance(payload, list):
            for item in payload:
                result = JobScraper._find_job_posting(item)
                if result:
                    return result

        return None

    @staticmethod
    def _is_job_posting_type(value: object) -> bool:
        if isinstance(value, str):
            return "jobposting" in value.lower()
        if isinstance(value, list):
            return any("jobposting" in str(item).lower() for item in value)
        return False

    @staticmethod
    def _extract_text_from_html(value: object) -> str | None:
        if value is None:
            return None

        raw = str(value)
        if "<" in raw and ">" in raw:
            text = BeautifulSoup(raw, "lxml").get_text(separator="\n", strip=True)
        else:
            text = raw

        return JobScraper._clean_text(text)

    @staticmethod
    def _extract_company_from_json_ld(value: object) -> str | None:
        if isinstance(value, str):
            return JobScraper._clean_text(value)

        if isinstance(value, dict):
            return JobScraper._clean_text(str(value.get("name") or ""))

        if isinstance(value, list):
            for item in value:
                company = JobScraper._extract_company_from_json_ld(item)
                if company:
                    return company

        return None

    @staticmethod
    def _extract_location_from_json_ld(value: object) -> str | None:
        if isinstance(value, str):
            return JobScraper._clean_text(value)

        if isinstance(value, dict):
            if "address" in value and isinstance(value["address"], dict):
                address = value["address"]
                parts = [
                    address.get("addressLocality"),
                    address.get("addressRegion"),
                    address.get("addressCountry"),
                ]
                cleaned = [JobScraper._clean_text(str(part)) for part in parts if part]
                if cleaned:
                    return ", ".join(cleaned)

            for key in ("name", "addressLocality", "addressRegion", "addressCountry", "value"):
                if value.get(key):
                    return JobScraper._clean_text(str(value[key]))

        if isinstance(value, list):
            for item in value:
                location = JobScraper._extract_location_from_json_ld(item)
                if location:
                    return location

        return None

    @staticmethod
    def _extract_title(soup: BeautifulSoup) -> str | None:
        for attr, key in (("property", "og:title"), ("name", "twitter:title")):
            tag = soup.find("meta", attrs={attr: key})
            if tag and tag.get("content"):
                return JobScraper._clean_text(tag["content"])

        for selector in ("h1", "h2[class*=title]", "h1[class*=job]"):
            tag = soup.select_one(selector)
            if isinstance(tag, Tag):
                text = JobScraper._clean_text(tag.get_text(" ", strip=True))
                if text:
                    return text

        if soup.title and soup.title.string:
            return JobScraper._clean_text(soup.title.string)

        return None

    @staticmethod
    def _extract_company(soup: BeautifulSoup) -> str | None:
        for attr, key in (("property", "og:site_name"), ("name", "application-name")):
            tag = soup.find("meta", attrs={attr: key})
            if tag and tag.get("content"):
                return JobScraper._clean_text(tag["content"])

        selectors = (
            "[data-testid*=company]",
            "[class*=company]",
            "[itemprop=hiringOrganization]",
            "a[href*=company]",
        )
        for selector in selectors:
            tag = soup.select_one(selector)
            if isinstance(tag, Tag):
                text = JobScraper._clean_text(tag.get_text(" ", strip=True))
                if text and len(text.split()) <= 12:
                    return text

        return None

    @staticmethod
    def _extract_location(soup: BeautifulSoup) -> str | None:
        selectors = (
            "[data-testid*=location]",
            "[class*=location]",
            "[itemprop=jobLocation]",
            "[itemprop=addressLocality]",
        )
        for selector in selectors:
            tag = soup.select_one(selector)
            if isinstance(tag, Tag):
                text = JobScraper._clean_text(tag.get_text(" ", strip=True))
                if text and len(text.split()) <= 20:
                    return text
        return None

    @staticmethod
    def _extract_description(soup: BeautifulSoup) -> str | None:
        selectors = (
            "[id*=job-description]",
            "[class*=job-description]",
            "[id*=jobDescription]",
            "[class*=jobDescription]",
            "[itemprop=description]",
            "[class*=description]",
            "main",
            "article",
            "[role=main]",
        )

        best_text = None
        best_score = 0

        for selector in selectors:
            for tag in soup.select(selector):
                if not isinstance(tag, Tag):
                    continue

                # Work on a local fragment and drop noisy nodes first to avoid returning
                # script/config payloads that some modern job pages embed in main content.
                fragment = BeautifulSoup(str(tag), "lxml")
                for noisy in fragment.select("script, style, noscript, template, svg"):
                    noisy.decompose()

                text = JobScraper._clean_text(fragment.get_text(separator="\n", strip=True))
                text = JobScraper._strip_machine_payload_lines(text)
                if not text:
                    continue

                word_count = len(text.split())
                if word_count < 20:
                    continue

                if not JobScraper._is_human_readable_description(text):
                    continue

                lower = text.lower()
                score = word_count

                if any(keyword in lower for keyword in JobScraper.DESCRIPTION_KEYWORDS):
                    score += 250

                if "cookie" in lower[:300] or "privacy policy" in lower[:300]:
                    score -= 250

                if score > best_score:
                    best_score = score
                    best_text = text

        section_text = JobScraper._extract_section_based_description(soup)
        if section_text:
            section_words = JobScraper._word_count(section_text)
            best_words = JobScraper._word_count(best_text)
            if section_words >= max(best_words + 40, int(best_words * 1.25)):
                best_text = section_text

        if best_text:
            return best_text

        body = soup.body
        if body:
            fragment = BeautifulSoup(str(body), "lxml")
            for noisy in fragment.select("script, style, noscript, template, svg"):
                noisy.decompose()
            text = JobScraper._clean_text(fragment.get_text(separator="\n", strip=True))
            text = JobScraper._strip_machine_payload_lines(text)
            if JobScraper._is_human_readable_description(text):
                return text

        return None

    @staticmethod
    def _extract_section_based_description(soup: BeautifulSoup) -> str | None:
        chunks: list[str] = []

        # 1) Pull known section containers directly by id/class semantics.
        section_selectors = (
            "[id*=responsibilit]",
            "[class*=responsibilit]",
            "[id*=requirement]",
            "[class*=requirement]",
            "[id*=qualification]",
            "[class*=qualification]",
            "[id*=job-description]",
            "[class*=job-description]",
            "[id*=jobDescription]",
            "[class*=jobDescription]",
        )

        for selector in section_selectors:
            for tag in soup.select(selector):
                if not isinstance(tag, Tag):
                    continue
                text = JobScraper._extract_clean_fragment_text(tag)
                if text and JobScraper._word_count(text) >= 20:
                    chunks.append(text)

        # 2) Find heading anchors and append neighboring content blocks.
        for heading in soup.select("h1, h2, h3, h4, h5, strong"):
            if not isinstance(heading, Tag):
                continue

            heading_text = JobScraper._clean_text(heading.get_text(" ", strip=True))
            if not heading_text:
                continue
            heading_lower = heading_text.lower()

            if not any(keyword in heading_lower for keyword in JobScraper.SECTION_KEYWORDS):
                continue

            neighbor_parts: list[str] = []
            steps = 0
            sibling = heading.find_next_sibling()
            while sibling is not None and steps < 5:
                if isinstance(sibling, Tag):
                    # stop at next heading to avoid bleeding into unrelated sections
                    if sibling.name in {"h1", "h2", "h3", "h4", "h5"}:
                        break
                    text = JobScraper._extract_clean_fragment_text(sibling)
                    if text and JobScraper._word_count(text) >= 12:
                        neighbor_parts.append(text)
                sibling = sibling.find_next_sibling() if isinstance(sibling, Tag) else None
                steps += 1

            if neighbor_parts:
                chunks.append("\n\n".join(neighbor_parts))

        if not chunks:
            return None

        # De-duplicate near-identical chunks.
        normalized_seen: set[str] = set()
        merged: list[str] = []
        for chunk in chunks:
            key = re.sub(r"\W+", " ", chunk.lower()).strip()
            if len(key) < 30:
                continue
            short_key = key[:240]
            if short_key in normalized_seen:
                continue
            normalized_seen.add(short_key)
            merged.append(chunk)

        combined = JobScraper._clean_text("\n\n".join(merged))
        combined = JobScraper._strip_machine_payload_lines(combined)
        if not JobScraper._is_human_readable_description(combined):
            return None
        return combined

    @staticmethod
    def _extract_clean_fragment_text(tag: Tag) -> str | None:
        fragment = BeautifulSoup(str(tag), "lxml")
        for noisy in fragment.select("script, style, noscript, template, svg"):
            noisy.decompose()
        text = JobScraper._clean_text(fragment.get_text(separator="\n", strip=True))
        return JobScraper._strip_machine_payload_lines(text)

    @staticmethod
    def _normalize_source(domain: str) -> str:
        normalized = (domain or "url").strip().lower()
        if normalized.startswith("www."):
            normalized = normalized[4:]
        return normalized or "url"

    @staticmethod
    def _clean_text(text: str | None) -> str | None:
        if not text:
            return None

        cleaned = re.sub(r"\r\n?", "\n", text)
        cleaned = re.sub(r"[ \t]+", " ", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        cleaned = cleaned.strip()
        return cleaned or None

    @staticmethod
    def _word_count(text: str | None) -> int:
        return len(text.split()) if text else 0

    @staticmethod
    def _looks_like_machine_payload(line: str) -> bool:
        if not line:
            return False

        lowered = line.lower()
        if "<script" in lowered or "</script" in lowered:
            return True

        known_payload_tokens = (
            "themeoptions",
            "navbardata",
            "pcsxconfig",
            "questionnaireid",
            "notificationconfig",
            "customtheme",
        )
        if any(token in lowered for token in known_payload_tokens):
            return True

        alpha_count = sum(1 for ch in line if ch.isalpha())
        symbol_count = sum(1 for ch in line if ch in "{}[]<>:=;\"`")
        has_json_shape = "{" in line and "}" in line and ":" in line

        if has_json_shape and symbol_count > max(8, alpha_count // 2):
            return True

        if len(line) > 180 and symbol_count > alpha_count * 0.35:
            return True

        return False

    @staticmethod
    def _strip_machine_payload_lines(text: str | None) -> str | None:
        if not text:
            return None

        kept_lines: list[str] = []
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                kept_lines.append("")
                continue
            if JobScraper._looks_like_machine_payload(line):
                continue
            kept_lines.append(line)

        return JobScraper._clean_text("\n".join(kept_lines))

    @staticmethod
    def _is_human_readable_description(text: str | None) -> bool:
        if not text:
            return False

        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if not lines:
            return False

        payload_like = sum(1 for line in lines if JobScraper._looks_like_machine_payload(line))
        return (payload_like / len(lines)) < 0.25

    @staticmethod
    def _choose_best_description(json_ld_description: str | None, generic_description: str | None) -> str | None:
        if generic_description and not JobScraper._is_human_readable_description(generic_description):
            generic_description = None

        if not json_ld_description:
            return generic_description
        if not generic_description:
            return json_ld_description

        json_ld_words = JobScraper._word_count(json_ld_description)
        generic_words = JobScraper._word_count(generic_description)

        if json_ld_words < JobScraper.MIN_DESCRIPTION_WORDS:
            return generic_description

        if generic_words > int(json_ld_words * JobScraper.DESCRIPTION_PREFERENCE_RATIO):
            return generic_description

        return json_ld_description

    @staticmethod
    async def _scrape_linkedin(url: str) -> tuple[bool, dict | None, str | None]:
        """
        Scrape LinkedIn job posting.

        Note: LinkedIn has strong anti-bot measures. This is a basic implementation.
        For production, consider using Playwright with stealth mode.
        """
        try:
            response = await JobScraper._fetch_page(url)

            if response.status_code != 200:
                return (
                    False,
                    None,
                    f"LinkedIn returned status {response.status_code}. Site may be blocking bots.",
                )

            soup = BeautifulSoup(response.text, "lxml")

            job_title = None
            company = None
            location = None
            description = None

            title_elem = soup.find("h1", class_=re.compile("top-card-layout__title"))
            if title_elem:
                job_title = title_elem.get_text(strip=True)

            company_elem = soup.find("a", class_=re.compile("topcard__org-name-link"))
            if company_elem:
                company = company_elem.get_text(strip=True)

            location_elem = soup.find("span", class_=re.compile("topcard__flavor--bullet"))
            if location_elem:
                location = location_elem.get_text(strip=True)

            desc_elem = soup.find("div", class_=re.compile("show-more-less-html__markup"))
            if desc_elem:
                description = desc_elem.get_text(separator="\n", strip=True)

            if not description:
                return (
                    False,
                    None,
                    "Could not extract job description from LinkedIn. Trying generic parsing.",
                )

            description = JobScraper._clean_text(description)
            if JobScraper._word_count(description) < JobScraper.MIN_DESCRIPTION_WORDS:
                return (
                    False,
                    None,
                    "LinkedIn description snippet too short. Trying generic parsing.",
                )

            logger.info("job_scraper.linkedin.success", title=job_title)

            return (
                True,
                {
                    "source": "linkedin",
                    "job_title": job_title,
                    "company": company,
                    "location": location,
                    "description": description,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                },
                None,
            )

        except httpx.TimeoutException:
            return False, None, "LinkedIn request timed out. Please try again or paste manually."
        except Exception as e:
            logger.exception("job_scraper.linkedin.failed", error=str(e))
            return False, None, f"LinkedIn scraping failed: {str(e)}"

    @staticmethod
    async def _scrape_indeed(url: str) -> tuple[bool, dict | None, str | None]:
        """Scrape Indeed job posting."""
        try:
            response = await JobScraper._fetch_page(url)

            if response.status_code != 200:
                return False, None, f"Indeed returned status {response.status_code}"

            soup = BeautifulSoup(response.text, "lxml")

            job_title = None
            company = None
            location = None
            description = None

            title_elem = soup.find("h1", class_=re.compile("jobsearch-JobInfoHeader-title"))
            if title_elem:
                job_title = title_elem.get_text(strip=True)

            company_elem = soup.find("div", {"data-company-name": True})
            if company_elem:
                company = company_elem.get("data-company-name")

            location_elem = soup.find("div", {"data-testid": "job-location"})
            if location_elem:
                location = location_elem.get_text(strip=True)

            desc_elem = soup.find("div", id="jobDescriptionText")
            if desc_elem:
                description = desc_elem.get_text(separator="\n", strip=True)

            if not description:
                return False, None, "Could not extract job description from Indeed. Trying generic parsing."

            description = JobScraper._clean_text(description)
            if JobScraper._word_count(description) < JobScraper.MIN_DESCRIPTION_WORDS:
                return False, None, "Indeed description snippet too short. Trying generic parsing."

            logger.info("job_scraper.indeed.success", title=job_title)

            return (
                True,
                {
                    "source": "indeed",
                    "job_title": job_title,
                    "company": company,
                    "location": location,
                    "description": description,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                },
                None,
            )

        except Exception as e:
            logger.exception("job_scraper.indeed.failed", error=str(e))
            return False, None, f"Indeed scraping failed: {str(e)}"

    @staticmethod
    async def _scrape_naukri(url: str) -> tuple[bool, dict | None, str | None]:
        """Scrape Naukri.com job posting."""
        try:
            response = await JobScraper._fetch_page(url)

            if response.status_code != 200:
                return False, None, f"Naukri returned status {response.status_code}"

            soup = BeautifulSoup(response.text, "lxml")

            job_title = None
            company = None
            location = None
            description = None

            title_elem = soup.find("h1", class_=re.compile("jd-header-title"))
            if title_elem:
                job_title = title_elem.get_text(strip=True)

            company_elem = soup.find("a", class_=re.compile("comp-name"))
            if company_elem:
                company = company_elem.get_text(strip=True)

            location_elem = soup.find("span", class_=re.compile("loc"))
            if location_elem:
                location = location_elem.get_text(strip=True)

            desc_elem = soup.find("div", class_=re.compile("jd-desc"))
            if desc_elem:
                description = desc_elem.get_text(separator="\n", strip=True)

            if not description:
                return False, None, "Could not extract job description from Naukri. Trying generic parsing."

            description = JobScraper._clean_text(description)
            if JobScraper._word_count(description) < JobScraper.MIN_DESCRIPTION_WORDS:
                return False, None, "Naukri description snippet too short. Trying generic parsing."

            logger.info("job_scraper.naukri.success", title=job_title)

            return (
                True,
                {
                    "source": "naukri",
                    "job_title": job_title,
                    "company": company,
                    "location": location,
                    "description": description,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                },
                None,
            )

        except Exception as e:
            logger.exception("job_scraper.naukri.failed", error=str(e))
            return False, None, f"Naukri scraping failed: {str(e)}"

    @staticmethod
    async def _scrape_glassdoor(url: str) -> tuple[bool, dict | None, str | None]:
        """Scrape Glassdoor job posting."""
        try:
            response = await JobScraper._fetch_page(url)

            if response.status_code != 200:
                return False, None, f"Glassdoor returned status {response.status_code}"

            soup = BeautifulSoup(response.text, "lxml")

            job_title = None
            company = None
            location = None
            description = None

            title_elem = soup.find("div", {"data-test": "job-title"})
            if title_elem:
                job_title = title_elem.get_text(strip=True)

            company_elem = soup.find("div", {"data-test": "employer-name"})
            if company_elem:
                company = company_elem.get_text(strip=True)

            location_elem = soup.find("div", {"data-test": "location"})
            if location_elem:
                location = location_elem.get_text(strip=True)

            desc_elem = soup.find("div", {"data-test": "job-description"})
            if desc_elem:
                description = desc_elem.get_text(separator="\n", strip=True)

            if not description:
                return False, None, "Could not extract job description from Glassdoor. Trying generic parsing."

            description = JobScraper._clean_text(description)
            if JobScraper._word_count(description) < JobScraper.MIN_DESCRIPTION_WORDS:
                return False, None, "Glassdoor description snippet too short. Trying generic parsing."

            logger.info("job_scraper.glassdoor.success", title=job_title)

            return (
                True,
                {
                    "source": "glassdoor",
                    "job_title": job_title,
                    "company": company,
                    "location": location,
                    "description": description,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                },
                None,
            )

        except Exception as e:
            logger.exception("job_scraper.glassdoor.failed", error=str(e))
            return False, None, f"Glassdoor scraping failed: {str(e)}"
