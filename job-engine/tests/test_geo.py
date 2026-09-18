"""Location aliases and geo scoring."""

from app.rank.geo import (
    expand_location_aliases,
    geo_match_score,
    location_matches,
    remote_pref_to_filter,
    resolve_country_codes,
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


def test_belgique_pref_matches_brussels_and_bruxelles():
    for pref in ("Belgique", "Belgium"):
        assert location_matches("Brussels, Belgium", pref)
        assert location_matches("Bruxelles", pref)
        assert location_matches("Brussels, BE", pref)


def test_belgique_pref_matches_gent_belgium():
    for pref in ("Belgique", "Belgium"):
        assert location_matches("Gent, Belgium", pref)
        assert location_matches("Ghent, Belgium", pref)
        assert location_matches("Gent, BE", pref)
        assert location_matches("Gand, Belgique", pref)


def test_gent_substring_does_not_match_argentina():
    """Belgium city alias `gent` is contained in `argentina` — must not match."""
    for pref in ("Belgique", "Belgium"):
        for job_location in (
            "Argentina",
            "Remote Argentina",
            "Remote, Argentina",
            "Argentina (Remote)",
            "Buenos Aires, Argentina",
            "Domino Data Lab – Argentina",
            "Remote.com / Argentina",
        ):
            assert not location_matches(job_location, pref), (pref, job_location)


def test_short_aliases_do_not_match_inside_unrelated_country_names():
    assert not location_matches("Ukraine", "United Kingdom")
    assert not location_matches("Ukraine", "UK")
    assert not location_matches("Argentina", "Gent")
    assert not location_matches("Thailand", "Netherlands")
    assert not location_matches("Finland", "Ireland")
    # `cork` (IE) must not hit a longer unrelated token
    assert not location_matches("Corkscrew, Alaska", "Ireland")


def test_belgium_hard_excludes_other_resolved_countries():
    for pref in ("Belgique", "Belgium"):
        assert not location_matches("United States", pref)
        assert not location_matches("Remote, US", pref)
        assert not location_matches("New York, United States", pref)
        assert not location_matches("AMER", pref)
        assert not location_matches("Remote - AMER", pref)
        assert not location_matches("LATAM", pref)


def test_worldwide_pref_allows_other_countries():
    assert location_matches("Argentina", "worldwide")
    assert location_matches("Remote Argentina", "Worldwide remote")


def test_resolve_countries_gent_is_be_argentina_is_ar():
    assert resolve_country_codes("Belgique") == frozenset({"BE"})
    assert resolve_country_codes("Gent, Belgium") == frozenset({"BE"})
    assert resolve_country_codes("Argentina") == frozenset({"AR"})
    assert resolve_country_codes("Remote Argentina") == frozenset({"AR"})
    # substring trap: argentina contains gent, must not resolve to BE
    assert "BE" not in resolve_country_codes("Argentina")


def test_geo_score_contributes_for_alias_hit():
    score, reasons = geo_match_score("Brussels, BE", "Belgium")
    assert score == 1.0
    assert reasons
    miss, _ = geo_match_score("New York, NY", "Belgium")
    assert miss == 0.0


def test_geo_chip_does_not_claim_belgique_match_for_argentina():
    for pref in ("Belgique", "Belgium"):
        score, reasons = geo_match_score("Argentina", pref)
        assert score == 0.0
        assert reasons == []
        assert not any("Location matches" in r for r in reasons)
        remote_score, remote_reasons = geo_match_score("Remote Argentina", pref)
        assert remote_score == 0.0
        assert remote_reasons == []


def test_onsite_maps_to_remote_false():
    assert remote_pref_to_filter("onsite") is False
    assert remote_pref_to_filter("remote") is True
    assert remote_pref_to_filter("hybrid") is None
