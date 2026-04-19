"""Unit tests for job offer availability detection and ATS-aware company extraction.

Tests cover:
- _check_content_availability: scraper-level deep check (12 patterns)
- _is_snippet_available: scout-level shallow check (same patterns, shorter text)
- _extract_company_from_url: ATS-aware company name extraction
- _cosine_similarity_pct: math correctness

All functions are pure / deterministic — no mocking required.
"""

import pytest

from app.graph.nodes.scraper import _check_content_availability
from app.graph.nodes.scout import _extract_company_from_url, _is_snippet_available


# ---------------------------------------------------------------------------
# _check_content_availability (scraper-level)
# ---------------------------------------------------------------------------


class TestCheckContentAvailability:
    """Tests for scraper-level deep content availability check.

    Each test targets a specific real-world pattern observed from ATS platforms.
    The function must catch all of them and correctly pass active postings through.
    """

    # ---- Unavailable cases -------------------------------------------------

    def test_generic_no_longer_available(self) -> None:
        content = "Sorry, this position is no longer available. Please check our other openings."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail
        assert reason is not None

    def test_position_has_been_filled(self) -> None:
        content = "The position has been filled. Thank you for your interest."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail
        assert reason is not None

    def test_posting_has_been_removed(self) -> None:
        content = "This listing has been removed by the employer."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail
        assert reason is not None

    def test_application_period_ended(self) -> None:
        content = "This job posting has expired. The application period has ended."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail
        assert reason is not None

    def test_no_longer_accepting_applications(self) -> None:
        content = "We are no longer accepting applications for this role."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail
        assert reason is not None

    def test_opportunity_closed(self) -> None:
        content = "This opportunity is closed. Please visit our careers page for other openings."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail
        assert reason is not None

    def test_404_page_not_found(self) -> None:
        content = "404 - Page not found. The job you are looking for does not exist."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail
        assert reason is not None

    # ---- ATS-specific patterns reported from real test runs ----------------

    def test_lever_couldnt_find_anything_here(self) -> None:
        """Exact Lever 404 page content from bug report."""
        content = (
            "Sorry, we couldn't find anything here\n"
            "The job posting you're looking for might have closed, "
            "or it has been removed. (404 error)."
        )
        is_avail, reason = _check_content_availability(content)
        assert not is_avail, "Lever 404 page must be detected as unavailable"
        assert reason is not None

    def test_lever_job_might_have_closed(self) -> None:
        content = "The job posting you're looking for might have closed."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail

    def test_lever_it_has_been_removed(self) -> None:
        content = "The position you applied for — it has been removed by the employer."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail

    def test_ashby_job_not_found_header(self) -> None:
        """Exact Ashby 404 page content from bug report."""
        content = "Job not found\nThe job you requested was not found."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail, "Ashby job-not-found page must be detected as unavailable"
        assert reason is not None

    def test_ashby_job_you_requested_was_not_found(self) -> None:
        content = "The job you requested was not found."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail

    def test_job_not_found_standalone(self) -> None:
        content = "job not found"
        is_avail, reason = _check_content_availability(content)
        assert not is_avail

    def test_case_insensitive_matching(self) -> None:
        content = "JOB NOT FOUND. The position has been FILLED."
        is_avail, reason = _check_content_availability(content)
        assert not is_avail

    def test_only_checks_first_2000_chars(self) -> None:
        """Availability notice buried far into a long document should NOT be caught
        (avoids false positives on pages that mention past closures)."""
        filler = "A" * 2100
        content = filler + "\nSorry, this position is no longer available."
        # The check intentionally only scans [:2000], so this should pass
        is_avail, _ = _check_content_availability(content)
        assert is_avail

    # ---- Available cases (must NOT trigger false positives) ----------------

    def test_active_job_posting_passes(self) -> None:
        content = (
            "Software Engineer at Stripe. We are looking for a talented developer "
            "to join our payments team. Python, Go, and distributed systems experience required."
        )
        is_avail, reason = _check_content_availability(content)
        assert is_avail
        assert reason is None

    def test_job_mentioning_filled_roles_in_context_passes(self) -> None:
        """A posting that mentions 'filled' in unrelated context should not be flagged."""
        content = (
            "We are looking for a Backend Engineer. Our team has filled the offices "
            "with talented engineers and we want to add more. Apply now!"
        )
        is_avail, reason = _check_content_availability(content)
        assert is_avail

    def test_senior_role_description_passes(self) -> None:
        content = (
            "Senior Product Manager — Remote\n"
            "About the role: Lead our growth initiatives and define the product roadmap. "
            "Requirements: 5+ years of PM experience, B2B SaaS background."
        )
        is_avail, reason = _check_content_availability(content)
        assert is_avail

    def test_empty_content_passes(self) -> None:
        """Empty content is not 'unavailable' — it will be caught by length validation."""
        is_avail, reason = _check_content_availability("")
        assert is_avail
        assert reason is None


# ---------------------------------------------------------------------------
# _is_snippet_available (scout-level)
# ---------------------------------------------------------------------------


class TestIsSnippetAvailable:
    """Tests for scout-level snippet availability check.

    Snippets are shorter (Tavily search result content), so patterns
    may appear truncated. Must still catch ATS-specific messages.
    """

    # ---- Unavailable cases -------------------------------------------------

    def test_lever_snippet_couldnt_find(self) -> None:
        snippet = "Sorry, we couldn't find anything here. The job posting might have closed."
        assert not _is_snippet_available(snippet)

    def test_ashby_snippet_job_not_found(self) -> None:
        snippet = "Job not found. The job you requested was not found."
        assert not _is_snippet_available(snippet)

    def test_snippet_no_longer_available(self) -> None:
        snippet = "This position is no longer available. See other openings."
        assert not _is_snippet_available(snippet)

    def test_snippet_position_filled(self) -> None:
        snippet = "The position has been filled. Thank you for your interest."
        assert not _is_snippet_available(snippet)

    def test_snippet_listing_expired(self) -> None:
        snippet = "This listing has expired. Please browse other jobs."
        assert not _is_snippet_available(snippet)

    def test_snippet_opportunity_closed(self) -> None:
        snippet = "This opportunity is closed."
        assert not _is_snippet_available(snippet)

    def test_snippet_404_not_found(self) -> None:
        snippet = "404 - Page not found."
        assert not _is_snippet_available(snippet)

    def test_snippet_application_period_closed(self) -> None:
        snippet = "Application period has closed."
        assert not _is_snippet_available(snippet)

    def test_snippet_it_has_been_removed(self) -> None:
        snippet = "it has been removed by the employer."
        assert not _is_snippet_available(snippet)

    def test_snippet_case_insensitive(self) -> None:
        assert not _is_snippet_available("JOB NOT FOUND")
        assert not _is_snippet_available("POSITION HAS BEEN FILLED")

    # ---- Available cases ---------------------------------------------------

    def test_active_snippet_passes(self) -> None:
        snippet = "Python Backend Engineer at Stripe — Join our payments team. CDI, remote-friendly."
        assert _is_snippet_available(snippet)

    def test_snippet_with_requirements_passes(self) -> None:
        snippet = "Requirements: 5+ years Python, FastAPI, PostgreSQL. Apply now!"
        assert _is_snippet_available(snippet)

    def test_empty_snippet_passes(self) -> None:
        """Empty snippet is caught by content-length validation, not availability check."""
        assert _is_snippet_available("")


# ---------------------------------------------------------------------------
# _extract_company_from_url (ATS-aware)
# ---------------------------------------------------------------------------


class TestExtractCompanyFromUrl:
    """Tests for ATS-aware company name extraction from job posting URLs.

    The function must correctly identify the *employer* company from the URL path,
    not the ATS platform name (Greenhouse, Lever, Workable, etc.).
    """

    # ---- ATS platforms: company is in URL path -----------------------------

    def test_greenhouse_boards_subdomain(self) -> None:
        url = "https://boards.greenhouse.io/stripe/jobs/12345"
        assert _extract_company_from_url(url) == "Stripe"

    def test_greenhouse_job_boards_subdomain(self) -> None:
        url = "https://job-boards.greenhouse.io/datadog/jobs/67890"
        assert _extract_company_from_url(url) == "Datadog"

    def test_lever(self) -> None:
        url = "https://jobs.lever.co/figma/abc-def-123"
        assert _extract_company_from_url(url) == "Figma"

    def test_lever_real_world_url(self) -> None:
        """URL from bug report."""
        url = "https://jobs.lever.co/Emesent/270ec1c6-1bd2-4a2f-a80a-f3c2d3feda53"
        assert _extract_company_from_url(url) == "Emesent"

    def test_ashby(self) -> None:
        url = "https://jobs.ashbyhq.com/linear/abc-123"
        assert _extract_company_from_url(url) == "Linear"

    def test_ashby_real_world_url(self) -> None:
        """URL from bug report."""
        url = "https://jobs.ashbyhq.com/picknik/2e9bb093-e8ed-458d-887c-b56882b19749"
        assert _extract_company_from_url(url) == "Picknik"

    def test_workable(self) -> None:
        url = "https://apply.workable.com/notion/j/ABC123/"
        assert _extract_company_from_url(url) == "Notion"

    def test_smartrecruiters(self) -> None:
        url = "https://careers.smartrecruiters.com/Datadog/743999"
        assert _extract_company_from_url(url) == "Datadog"

    # ---- Hyphenated company names become title-cased -----------------------

    def test_hyphenated_company_name(self) -> None:
        url = "https://jobs.lever.co/open-ai/some-job-id"
        result = _extract_company_from_url(url)
        assert result == "Open Ai"  # hyphen → space → title-case

    # ---- Direct career pages: company is in domain -------------------------

    def test_direct_career_subdomain(self) -> None:
        url = "https://careers.stripe.com/jobs/123"
        assert _extract_company_from_url(url) == "Stripe"

    def test_jobs_subdomain(self) -> None:
        url = "https://jobs.acme.io/engineer/123"
        assert _extract_company_from_url(url) == "Acme"

    def test_root_domain_careers_path(self) -> None:
        url = "https://www.example.com/careers/job/123"
        assert _extract_company_from_url(url) == "Example"

    # ---- Edge cases --------------------------------------------------------

    def test_malformed_url_returns_unknown(self) -> None:
        result = _extract_company_from_url("not-a-url")
        assert isinstance(result, str)
        assert len(result) > 0  # should not crash, returns something

    def test_empty_url_returns_unknown(self) -> None:
        result = _extract_company_from_url("")
        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# _cosine_similarity_pct (math)
# ---------------------------------------------------------------------------


class TestCosineSimilarityPct:
    """Tests for the cosine similarity helper used in pre-scoring."""

    def test_identical_vectors_return_100(self) -> None:
        from app.graph.nodes.scout import _cosine_similarity_pct

        v = [1.0, 0.0, 0.0]
        assert _cosine_similarity_pct(v, v) == pytest.approx(100.0)

    def test_orthogonal_vectors_return_0(self) -> None:
        from app.graph.nodes.scout import _cosine_similarity_pct

        assert _cosine_similarity_pct([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)

    def test_opposite_vectors_return_negative(self) -> None:
        from app.graph.nodes.scout import _cosine_similarity_pct

        result = _cosine_similarity_pct([1.0, 0.0], [-1.0, 0.0])
        assert result < 0

    def test_zero_vector_returns_fallback(self) -> None:
        from app.graph.nodes.scout import _cosine_similarity_pct

        result = _cosine_similarity_pct([0.0, 0.0], [1.0, 0.0])
        assert result == pytest.approx(50.0)

    def test_scaled_vector_same_as_unit(self) -> None:
        from app.graph.nodes.scout import _cosine_similarity_pct

        v = [3.0, 0.0]
        w = [7.0, 0.0]
        assert _cosine_similarity_pct(v, w) == pytest.approx(100.0)
