"""Packet-ready notification copy. HITL: user reviews, copies, applies. Ariadne never sends."""

PACKET_READY_COPY: dict[str, dict[str, str]] = {
    "en": {
        "subject": "Ariadne — your packet is ready to review",
        "heading": "Your packet is ready to review",
        "body": (
            "Ariadne drafted a letter in your tone. Copy it, open the employer’s ATS, "
            "and submit yourself — we never apply for you."
        ),
        "cta": "Review packet",
        "fallback": "If the button doesn't work, copy and paste this link into your browser:",
        "signoff": "Ariadne",
    },
    "fr": {
        "subject": "Ariadne — votre dossier est prêt à relire",
        "heading": "Votre dossier est prêt à relire",
        "body": (
            "Ariadne a rédigé une lettre dans votre ton. Copiez-la, ouvrez l’ATS de l’employeur "
            "et postulez vous-même — nous ne postulons jamais à votre place."
        ),
        "cta": "Relire le dossier",
        "fallback": "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
        "signoff": "Ariadne",
    },
    "nl": {
        "subject": "Ariadne — je packet is klaar voor review",
        "heading": "Je packet is klaar voor review",
        "body": (
            "Ariadne schreef een brief in jouw toon. Kopieer hem, open de ATS van de werkgever "
            "en dien zelf in — wij solliciteren nooit voor jou."
        ),
        "cta": "Packet reviewen",
        "fallback": "Werkt de knop niet, plak dan deze link in je browser:",
        "signoff": "Ariadne",
    },
}


def packet_ready_email(locale: str, dashboard_url: str) -> tuple[str, str]:
    """Return (subject, html) for the packet-ready notification. Locale falls back to en."""
    copy = PACKET_READY_COPY.get(locale, PACKET_READY_COPY["en"])
    subject = copy["subject"]
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #111;">{copy["heading"]}</h2>
        <p>{copy["body"]}</p>
        <p style="margin: 24px 0;">
          <a href="{dashboard_url}" style="display: inline-block; padding: 12px 24px; color: #fff; background-color: #111; text-decoration: none; border-radius: 6px; font-weight: bold;">
            {copy["cta"]}
          </a>
        </p>
        <p>{copy["fallback"]}</p>
        <p><a href="{dashboard_url}" style="color: #0066cc;">{dashboard_url}</a></p>
        <br />
        <p>{copy["signoff"]}</p>
      </body>
    </html>
    """
    return subject, html
