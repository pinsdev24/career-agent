"""Profile-driven demand packs — role family, FR/NL, ATS hosts, no company list."""

from app.workers import discovery as discovery_mod
from app.workers.demand import build_demand_packs, demand_packs_from_profile, infer_role_family


def test_no_generic_default_queries():
    assert not hasattr(discovery_mod, "DEFAULT_QUERIES")


def test_role_families_differ_and_include_ats_hosts():
    eng = build_demand_packs(
        title="Backend Engineer",
        location="Belgium",
        skills=["python", "fastapi"],
    )
    data = build_demand_packs(
        title="Data Scientist",
        location="Belgium",
        skills=["python", "pandas"],
    )
    sales = build_demand_packs(
        title="Account Executive",
        location="Belgium",
        skills=["salesforce"],
    )
    embedded = build_demand_packs(
        title="Firmware Engineer",
        location="Belgium",
        skills=["C", "RTOS"],
    )
    assert eng and data and sales and embedded
    assert eng != sales
    assert infer_role_family("Firmware Engineer", ["C"]) == "embedded"
    assert infer_role_family("Account Executive", []) == "sales"
    blob = " ".join(eng).lower()
    assert "belgium" in blob or "bruxelles" in blob or "brussels" in blob
    assert "site:boards.greenhouse.io" in blob
    assert "site:teamtailor.com" in blob
    for pack in (eng, data, sales, embedded):
        joined = " ".join(pack).lower()
        assert "stripe" not in joined
        assert "airbnb" not in joined


def test_fr_nl_variants_for_belgium():
    packs = build_demand_packs(title="Software Engineer", location="Belgium")
    blob = " ".join(packs).lower()
    assert "ingénieur" in blob or "ontwikkelaar" in blob or "développeur" in blob
    assert "belgique" in blob or "belgië" in blob or "bruxelles" in blob


def test_demand_packs_follow_profile_iso_countries_not_be_default():
    packs = demand_packs_from_profile(
        {"job_title": "Backend Engineer", "countries": ["AR", "SE"]},
        {},
    )
    blob = " ".join(packs).lower()
    assert packs
    assert "site:teamtailor.com" in blob
    assert "argentina" in blob
    assert "sweden" in blob or "suède" in blob or "suede" in blob
    assert "belgium" not in blob
    assert "bruxelles" not in blob
    assert "indeed.com" not in blob
    assert "linkedin.com" not in blob
