"""Unit tests for URL quality gates."""

from app.quality.gates import is_closed_job_text, passes_content_gates
from app.quality.urls import (
    extract_ats_board_slug,
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
    assert not is_valid_job_url("https://boards.greenhouse.io/stripe")
    assert not is_valid_job_url("https://www.linkedin.com/jobs/search/?keywords=eng")
    assert not is_valid_job_url("https://www.indeed.com/jobs?q=engineer")


def test_extract_board_slug():
    assert extract_ats_board_slug("https://boards.greenhouse.io/stripe/jobs/1") == (
        "greenhouse",
        "stripe",
    )
    assert extract_ats_board_slug("https://jobs.lever.co/netlify/abc") == ("lever", "netlify")
    assert extract_ats_board_slug("https://jobs.ashbyhq.com/ramp/xyz") == ("ashby", "ramp")


def test_closed_job_detection():
    assert is_closed_job_text("This position has been filled")
    assert is_closed_job_text("Sorry, we couldn't find this job")
    assert not is_closed_job_text("We are hiring a senior engineer to join our team")


def test_content_gates():
    assert not passes_content_gates("too short", min_chars=100)
    assert passes_content_gates("x" * 120, min_chars=100)
    assert not passes_content_gates("This listing has expired. " + "x" * 120, min_chars=100)
