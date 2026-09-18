"""Recommend query is profile-driven — never a hardcoded software-engineer fallback."""

from app.rank.query import build_recommend_query


def test_uses_target_title_and_cv_skills():
    q = build_recommend_query(
        {"job_title": "Firmware Engineer"},
        {"skills": ["C", "RTOS", "Python"]},
    )
    assert "Firmware Engineer" in q
    assert "RTOS" in q
    assert "software engineer" not in q.lower()


def test_falls_back_to_cv_experience_title():
    q = build_recommend_query(
        {},
        {"experience": [{"title": "Account Executive", "company": "Acme"}]},
    )
    assert "Account Executive" in q
    assert "software engineer" not in q.lower()


def test_empty_when_no_title_signal():
    q = build_recommend_query({}, {"skills": []})
    assert q == ""


def test_does_not_override_existing_title_with_engineer_default():
    q = build_recommend_query({"job_title": "Commercial"}, {"skills": ["salesforce"]})
    assert q.startswith("Commercial")
    assert "software engineer" not in q.lower()
