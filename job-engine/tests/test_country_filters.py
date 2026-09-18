"""Token country parsing — Gent must not resolve Argentina; Belgique → BE."""

from app.rank.countries import countries_from_text, parse_posting_location, posting_country_code
from app.rank.filters import (
    CatalogFilters,
    filters_from_prefs,
    normalize_search_preferences,
    preferred_role_gate,
    row_matches_structured,
)
from app.rank.geo import geo_match_score


def test_argentina_is_ar_not_be():
    parsed = parse_posting_location("Argentina")
    assert parsed.country_code == "AR"
    assert parse_posting_location("Remote Argentina").country_code == "AR"
    assert parse_posting_location("Buenos Aires, Argentina").country_code == "AR"


def test_gent_belgium_is_be():
    assert parse_posting_location("Gent, Belgium").country_code == "BE"
    assert parse_posting_location("Ghent, Belgium").country_code == "BE"
    assert parse_posting_location("Gent, BE").country_code == "BE"
    assert parse_posting_location("Bruxelles, Belgique").country_code == "BE"
    assert parse_posting_location("Brussels, Belgium").country_code == "BE"


def test_bare_gent_token_is_be_not_substring_of_argentina():
    assert parse_posting_location("Gent").country_code == "BE"
    # The whole string Argentina is a country name, not the city token "gent".
    assert parse_posting_location("Argentina").country_code == "AR"
    assert parse_posting_location("Argentina").country_code != "BE"
    # Unanchored "gent" would false-positive; token parse must not.
    assert "gent" in "argentina"
    assert parse_posting_location("Remote Argentina").country_code == "AR"


def test_legacy_location_normalizes_to_be():
    prefs = normalize_search_preferences({"location": "Belgique", "job_title": "Ingénieur IA"})
    assert prefs["countries"] == ["BE"]
    resolved = filters_from_prefs({"location": "Belgium"})
    assert resolved.countries == ["BE"]
    assert countries_from_text("Belgique") == ["BE"]


def test_hard_country_filter_excludes_argentina_when_pref_be():
    be_job = {
        "title": "AI Engineer",
        "location": "Brussels, Belgium",
        "country_code": "BE",
        "remote": False,
    }
    ar_job = {
        "title": "AI Engineer",
        "location": "Argentina",
        "country_code": "AR",
        "remote": True,
    }
    ar_text_only = {
        "title": "AI Engineer",
        "location": "Remote Argentina",
        "remote": True,
    }
    filters = CatalogFilters(countries=["BE"])
    assert row_matches_structured(be_job, filters)
    assert not row_matches_structured(ar_job, filters)
    assert not row_matches_structured(ar_text_only, filters)


def test_country_filter_does_not_silently_drop():
    filters = CatalogFilters(countries=["BE"])
    assert filters.hard_filters_on()
    nyc = {"title": "Engineer", "location": "New York, NY", "country_code": "US"}
    assert not row_matches_structured(nyc, filters)


def test_why_chip_only_when_country_gate_passes():
    score, reasons = geo_match_score(
        "Argentina",
        "Belgique",
        job_country="AR",
        pref_countries=["BE"],
    )
    assert score == 0.0
    assert reasons == []
    hit, hit_reasons = geo_match_score(
        "Brussels, Belgium",
        "Belgique",
        job_country="BE",
        pref_countries=["BE"],
    )
    assert hit == 1.0
    assert hit_reasons == ["why_location_match"]
    assert not any("Argentina" in r for r in hit_reasons)


def test_sales_does_not_pass_eng_ai_role_gate():
    roles = ["Ingénieur IA", "eng"]
    assert preferred_role_gate("AI Engineer", roles)
    assert preferred_role_gate("Machine Learning Engineer", roles)
    assert not preferred_role_gate("Account Executive", roles)
    assert not preferred_role_gate("Sales Development Representative", roles)
    assert not preferred_role_gate("Enterprise Account Manager", roles)


def test_job_title_becomes_preferred_role_for_title_gate():
    filters = filters_from_prefs({"job_title": "Ingénieur IA", "countries": ["BE"]})
    assert filters.roles == ["Ingénieur IA"]
    sales = {"title": "Account Executive", "country_code": "BE", "location": "Brussels"}
    ai = {"title": "AI Engineer", "country_code": "BE", "location": "Brussels"}
    assert not row_matches_structured(sales, filters)
    assert row_matches_structured(ai, filters)


def test_contract_filter_skips_unknown_posting_type():
    from app.models.prefs import ContractType

    filters = CatalogFilters(contract_types=[ContractType.PERMANENT])
    unknown = {"title": "Engineer", "location": "Brussels", "country_code": "BE"}
    cdi = {
        "title": "Engineer",
        "location": "Brussels",
        "country_code": "BE",
        "contract_type": "CDI",
    }
    freelance = {
        "title": "Engineer",
        "location": "Brussels",
        "country_code": "BE",
        "contract_type": "freelance",
    }
    assert row_matches_structured(unknown, filters)
    assert row_matches_structured(cdi, filters)
    assert not row_matches_structured(freelance, filters)


def test_posting_country_code_falls_back_to_location():
    row = {"location": "Antwerpen", "country_code": None}
    assert posting_country_code(row) == "BE"
