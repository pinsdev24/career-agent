"""Structured search preferences — legacy location normalizes to ISO countries."""

from app.models.schemas import SearchPreferences, countries_from_location_text


def test_belgique_normalizes_to_be():
    assert countries_from_location_text("Belgique") == ["BE"]
    prefs = SearchPreferences(location="Belgique", job_title="Ingénieur IA")
    data = prefs.normalized()
    assert data["countries"] == ["BE"]
    assert data["job_title"] == "Ingénieur IA"


def test_explicit_countries_are_kept():
    prefs = SearchPreferences(location="Paris", countries=["NL", "be"])
    assert prefs.normalized()["countries"] == ["NL", "BE"]


def test_remote_preference_becomes_work_modes():
    prefs = SearchPreferences(remote_preference="onsite")
    assert prefs.normalized()["work_modes"] == ["onsite"]
