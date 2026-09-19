"""Packet-ready email copy — Ariadne HITL, never Career Labyrinth / CareerAgent."""

from app.tools.email_copy import PACKET_READY_COPY, packet_ready_email


def test_english_subject_is_exact():
    subject, html = packet_ready_email("en", "https://example.com/dashboard/pipeline/abc")
    assert subject == "Ariadne — your packet is ready to review"
    assert "Your packet is ready to review" in html
    assert "never apply for you" in html
    assert "https://example.com/dashboard/pipeline/abc" in html


def test_french_and_dutch_subjects():
    fr_subject, fr_html = packet_ready_email("fr", "https://app.example/run")
    nl_subject, nl_html = packet_ready_email("nl", "https://app.example/run")
    assert fr_subject == "Ariadne — votre dossier est prêt à relire"
    assert nl_subject == "Ariadne — je packet is klaar voor review"
    assert "postulez vous-même" in fr_html
    assert "dien zelf in" in nl_html


def test_unknown_locale_falls_back_to_english():
    subject, _html = packet_ready_email("de", "https://x")
    assert subject == PACKET_READY_COPY["en"]["subject"]


def test_email_never_uses_banned_brand():
    blob = "\n".join(
        f"{row['subject']}\n{row['heading']}\n{row['body']}\n{row['cta']}"
        for row in PACKET_READY_COPY.values()
    )
    assert "Career Labyrinth" not in blob
    assert "CareerAgent" not in blob
    assert "MACA" not in blob
    assert "ariadne.app" not in blob
    assert "navigated" not in blob.lower()
