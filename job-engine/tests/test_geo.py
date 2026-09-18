"""Location aliases and geo scoring."""

from app.rank.geo import (
    expand_location_aliases,
    geo_match_score,
    location_matches,
    remote_pref_to_filter,
)


def test_belgium_aliases_include_cities_and_languages():
    aliases = {a.lower() for a in expand_location_aliases("Belgium")}
    for term in ("belgium", "bruxelles", "brussels", "gent", "antwerp", "belgie"):
        assert term in aliases


def test_brussels_matches_belgium_pref():
    assert location_matches("Bruxelles, Belgique", "Belgium")
    assert location_matches("Ghent, Belgium", "Belgium")
    assert location_matches("Antwerpen", "Belgium")
    assert not location_matches("New York, NY", "Belgium")
    assert not location_matches("San Francisco", "Belgium")


def test_geo_score_contributes_for_alias_hit():
    score, reasons = geo_match_score("Brussels, BE", "Belgium")
    assert score == 1.0
    assert reasons
    miss, _ = geo_match_score("New York, NY", "Belgium")
    assert miss == 0.0


def test_onsite_maps_to_remote_false():
    assert remote_pref_to_filter("onsite") is False
    assert remote_pref_to_filter("remote") is True
    assert remote_pref_to_filter("hybrid") is None
