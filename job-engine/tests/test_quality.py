"""Unit tests for URL quality gates."""

from app.quality.gates import is_closed_job_text, passes_content_gates
from app.quality.urls import (
    extract_ats_board_slug,
    extract_ats_job_ref,
    is_aggregator_url,
    is_valid_job_url,
)


def test_rejects_aggregators():
    assert is_aggregator_url("https://www.indeed.com/viewjob?jk=abc")
    assert is_aggregator_url("https://jooble.org/jobs")
    assert not is_aggregator_url("https://boards.greenhouse.io/stripe/jobs/123")


def test_valid_ats_urls():
    assert is_valid_job_url("https://boards.greenhouse.io/stripe/jobs/12345")
    assert is_valid_job_url("https://jobs.lever.co/netlify/abc-def")
    assert is_valid_job_url("https://jobs.ashbyhq.com/ramp/uuid-here")
    assert is_valid_job_url(
        "https://acme.teamtailor.com/jobs/1234567-backend-engineer"
    )
    assert not is_valid_job_url("https://acme.teamtailor.com/jobs")
    assert not is_valid_job_url("https://boards.greenhouse.io/stripe")
    assert not is_valid_job_url("https://www.linkedin.com/jobs/search/?keywords=eng")
    assert not is_valid_job_url("https://www.indeed.com/jobs?q=engineer")


def test_extract_board_slug():
    assert extract_ats_board_slug("https://boards.greenhouse.io/stripe/jobs/1") == (
        "greenhouse",
        "stripe",
    )
    assert extract_ats_board_slug("https://job-boards.greenhouse.io/datadog/jobs/9") == (
        "greenhouse",
        "datadog",
    )
    assert extract_ats_board_slug("https://boards.greenhouse.io/stripe") == (
        "greenhouse",
        "stripe",
    )
    assert extract_ats_board_slug(
        "https://boards.greenhouse.io/embed/job_board?for=notion"
    ) == ("greenhouse", "notion")
    assert extract_ats_board_slug("https://jobs.lever.co/netlify/abc") == ("lever", "netlify")
    assert extract_ats_board_slug("https://jobs.ashbyhq.com/ramp/xyz") == ("ashby", "ramp")
    assert extract_ats_board_slug(
        "https://jobs.ashbyhq.com/mistral.ai/50c74749-9fbc-471f-a647-f6cd22423ccf"
    ) == ("ashby", "mistral.ai")
    assert extract_ats_board_slug("https://jobs.ashbyhq.com/mistral.ai") == (
        "ashby",
        "mistral.ai",
    )
    assert extract_ats_board_slug(
        "https://job-boards.greenhouse.io/datacamp/jobs/7481117"
    ) == ("greenhouse", "datacamp")
    assert extract_ats_board_slug("https://apply.workable.com/acme/j/ABC123") == (
        "workable",
        "acme",
    )
    assert extract_ats_board_slug("https://acme.teamtailor.com/jobs") == (
        "teamtailor",
        "acme",
    )
    assert extract_ats_board_slug(
        "https://acme.teamtailor.com/jobs/1234567-backend-engineer"
    ) == ("teamtailor", "acme")
    assert extract_ats_board_slug(
        "https://oatly.teamtailor.com/en-GB/jobs/8399088-national-account-manager"
    ) == ("teamtailor", "oatly")
    assert extract_ats_job_ref(
        "https://jobs.ashbyhq.com/mistral.ai/50c74749-9fbc-471f-a647-f6cd22423ccf"
    ) == ("ashby", "mistral.ai", "50c74749-9fbc-471f-a647-f6cd22423ccf")
    assert extract_ats_job_ref(
        "https://job-boards.greenhouse.io/datacamp/jobs/7481117"
    ) == ("greenhouse", "datacamp", "7481117")
    assert extract_ats_job_ref(
        "https://acme.teamtailor.com/jobs/1234567-backend-engineer"
    ) == ("teamtailor", "acme", "1234567-backend-engineer")
    assert extract_ats_job_ref("https://acme.teamtailor.com/jobs") == (
        "teamtailor",
        "acme",
        None,
    )


def test_extract_board_slug_rejects_non_ats():
    assert extract_ats_board_slug("https://www.linkedin.com/jobs/view/123") is None
    assert extract_ats_board_slug("https://www.indeed.com/viewjob?jk=abc") is None
    assert extract_ats_board_slug("https://acme.jobs.personio.de/job/123") is None
    assert extract_ats_board_slug("https://example.com/careers/eng") is None
    assert extract_ats_board_slug("https://careers.acme.com/jobs/123") is None
    assert extract_ats_board_slug("https://www.teamtailor.com/") is None
    assert extract_ats_board_slug("https://app.teamtailor.com/jobs/1") is None
    assert extract_ats_board_slug("https://boards.greenhouse.io/embed/job_board") is None
    assert extract_ats_board_slug("") is None


def test_closed_job_detection():
    assert is_closed_job_text("This position has been filled")
    assert is_closed_job_text("Sorry, we couldn't find this job")
    assert not is_closed_job_text("We are hiring a senior engineer to join our team")


def test_content_gates():
    assert not passes_content_gates("too short", min_chars=100)
    assert passes_content_gates("x" * 120, min_chars=100)
    assert not passes_content_gates("This listing has expired. " + "x" * 120, min_chars=100)
