"""Unit tests for ranking / query relevance."""

from app.rank.scorer import _query_relevance, decode_cursor, encode_cursor, score_job


def test_score_prefers_skill_overlap():
    job = {
        "id": "1",
        "source": "greenhouse",
        "skills": ["python", "fastapi"],
        "title": "Backend Engineer",
        "company_name": "Acme",
        "description_text": "We need python and fastapi experience",
        "posted_at": "2026-07-20T00:00:00+00:00",
        "last_seen_at": "2026-07-28T00:00:00+00:00",
    }
    high = score_job(
        job,
        semantic=0.8,
        cv_skills=["python", "fastapi", "react"],
        dismissed=set(),
        saved=set(),
    )
    low = score_job(
        job,
        semantic=0.8,
        cv_skills=["cobol", "fortran"],
        dismissed=set(),
        saved=set(),
    )
    assert high.total > low.total
    assert "python" in high.matching_skills


def test_query_relevance_ranks_title_hits():
    job_ai = {
        "id": "a",
        "title": "AI Engineer",
        "company_name": "OpenAI",
        "location": "Remote",
        "description_text": "Build ML systems",
        "source": "greenhouse",
        "skills": [],
    }
    job_other = {
        "id": "b",
        "title": "Facilities Manager",
        "company_name": "Acme",
        "location": "NYC",
        "description_text": "Office operations",
        "source": "greenhouse",
        "skills": [],
    }
    ai_score, ai_reasons = _query_relevance("AI Engineer", job_ai)
    other_score, _ = _query_relevance("AI Engineer", job_other)
    assert ai_score > other_score
    assert ai_reasons


def test_search_score_boosts_query_match():
    job = {
        "id": "1",
        "source": "greenhouse",
        "skills": [],
        "title": "Senior AI Engineer",
        "company_name": "Stripe",
        "location": "Remote",
        "description_text": "Work on applied AI platforms",
        "posted_at": "2026-07-20T00:00:00+00:00",
        "last_seen_at": "2026-07-28T00:00:00+00:00",
    }
    with_q = score_job(
        job,
        semantic=0.1,
        cv_skills=[],
        dismissed=set(),
        saved=set(),
        query="AI Engineer",
    )
    without_q = score_job(
        job,
        semantic=0.1,
        cv_skills=[],
        dismissed=set(),
        saved=set(),
        query="",
    )
    assert with_q.total > without_q.total


def test_dismissed_novelty_zero():
    job = {
        "id": "x",
        "source": "tavily",
        "skills": [],
        "title": "Engineer",
        "company_name": "X",
        "description_text": "something long enough",
        "posted_at": None,
        "last_seen_at": None,
    }
    breakdown = score_job(
        job,
        semantic=0.9,
        cv_skills=[],
        dismissed={"x"},
        saved=set(),
    )
    assert breakdown.novelty == 0.0


def test_cursor_roundtrip():
    cursor = encode_cursor(88.5, "abc")
    assert decode_cursor(cursor) == (88.5, "abc")
    assert decode_cursor(None) is None
