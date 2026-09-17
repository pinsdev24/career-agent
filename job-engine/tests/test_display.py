"""Dirty-fixture tests for title/company display cleaners."""

from app.models.schemas import AtsProvider
from app.normalize.posting import build_canonical_job
from app.quality.display import clean_job_title, company_from_apply_url, display_company

DIRTY_TITLES = [
    ("Senior Software Engineer | Acme", "Senior Software Engineer", "Acme"),
    ("Senior Software Engineer | Acme | LinkedIn", "Senior Software Engineer", "Acme"),
    ("Product Designer - Jobs", "Product Designer", None),
    ("Product Designer – Jobs", "Product Designer", None),
    ("Backend Engineer - Application - Workable", "Backend Engineer", None),
    ("Application - Workable", "", None),
    ("Staff Product Manager at Stripe | LinkedIn", "Staff Product Manager", "Stripe"),
    ("Software Engineer | Greenhouse", "Software Engineer", None),
    ("Data Analyst | Indeed", "Data Analyst", None),
    ("UX Designer – Jobs at Figma", "UX Designer", None),
    ("Apply for Frontend Engineer", "Frontend Engineer", None),
    ("Job Application for Account Executive at Notion", "Account Executive", "Notion"),
    ("Platform Engineer | jobs.lever.co", "Platform Engineer", None),
    ("  Full-Stack Engineer  |  Company  ", "Full-Stack Engineer", None),
    ("Développeur | Emplois", "Développeur", None),
    ("Product Owner - Vacatures", "Product Owner", None),
    ("Clean Title", "Clean Title", None),
    ("Engineer (Remote) | Lever", "Engineer (Remote)", None),
]


def test_clean_job_title_dirty_fixtures():
    for raw, expected, company in DIRTY_TITLES:
        assert clean_job_title(raw, company) == expected, raw


def test_clean_job_title_leaves_no_aggregator_chrome():
    for raw, _expected, company in DIRTY_TITLES:
        title = clean_job_title(raw, company)
        assert " | " not in title
        assert not title.lower().endswith("- jobs")
        assert "application - workable" not in title.lower()
        assert "workable" not in title.lower()
        assert "linkedin" not in title.lower()


def test_display_company_never_url_host():
    assert (
        display_company(
            "jobs.lever.co",
            company_slug="netlify",
            apply_url="https://jobs.lever.co/netlify/abc-def",
        )
        == "Netlify"
    )
    assert (
        display_company(
            "stripe.com",
            apply_url="https://boards.greenhouse.io/stripe/jobs/99",
        )
        == "Stripe"
    )
    assert display_company("Stripe", apply_url="https://boards.greenhouse.io/stripe/jobs/1") == "Stripe"
    assert company_from_apply_url("https://jobs.ashbyhq.com/ramp/uuid-here") == "Ramp"


def test_canonical_job_strips_chrome_at_ingest():
    job = build_canonical_job(
        source=AtsProvider.GREENHOUSE,
        external_id="1",
        company_name="jobs.lever.co",
        title="Engineer | Acme | LinkedIn",
        description_text="A real engineering role with plenty of description text.",
        apply_url="https://boards.greenhouse.io/acme/jobs/1",
        company_slug="acme",
    )
    assert job.title == "Engineer"
    assert job.company_name == "Acme"
    assert "." not in job.company_name
