import logging
import resend
from app.config import get_settings
from app.tools.email_copy import packet_ready_email
from supabase import AsyncClient

logger = logging.getLogger(__name__)


async def send_pipeline_completion_email(
    user_email: str,
    run_id: str,
    locale: str = "en",
) -> None:
    """Send an email notification when the pipeline completes using Resend."""
    settings = get_settings()

    if not settings.resend_api_key:
        logger.warning("No resend_api_key provided, skipping email notification.")
        return

    resend.api_key = settings.resend_api_key
    from_email = getattr(settings, "from_email", "Ariadne <onboarding@resend.dev>")

    dashboard_url = f"{settings.frontend_url}/dashboard/pipeline/{run_id}"
    subject, html_content = packet_ready_email(locale, dashboard_url)

    try:
        # resend.Emails.send is a synchronous call in the official SDK, but we run it in an async context.
        # It's usually fast enough, but ideally could be run in a threadpool.
        resend.Emails.send({
            "from": from_email,
            "to": user_email,
            "subject": subject,
            "html": html_content,
        })
        logger.info(f"Pipeline completion email sent to {user_email}, run_id={run_id}")
    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {e}")

async def notify_user_if_completed(supabase: AsyncClient, run_id: str, user_id: str | None, status: str) -> None:
    """Check if status is completed and send notification."""
    if status != "completed":
        return

    try:
        if not user_id:
            # We might not have user_id if we resumed a paused pipeline. Fetch it.
            # Using Supabase PostgREST client:
            resp = await supabase.table("pipeline_runs").select("user_id").eq("id", run_id).execute()
            if not resp.data:
                logger.error(f"Cannot find pipeline run {run_id} to send notification.")
                return
            user_id = resp.data[0]["user_id"]

        # Fetch the user's email from Supabase Auth
        admin_auth_client = supabase.auth.admin
        user_resp = await admin_auth_client.get_user_by_id(user_id)
        user_email = user_resp.user.email

        locale = "en"
        try:
            from app.tools.supabase_ops import get_profile

            profile = await get_profile(supabase, user_id)
            locale = profile.get("language_preference") or "en"
        except Exception:
            logger.info("No language preference for user %s; defaulting email to en", user_id)

        if user_email:
            await send_pipeline_completion_email(user_email, run_id, locale=locale)
        else:
            logger.warning(f"Could not find email for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to notify user {user_id} of completion: {e}")
