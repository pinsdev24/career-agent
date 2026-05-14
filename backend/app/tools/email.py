import logging
import resend
from app.config import get_settings
from supabase import AsyncClient

logger = logging.getLogger(__name__)


async def send_pipeline_completion_email(user_email: str, run_id: str) -> None:
    """Send an email notification when the pipeline completes using Resend."""
    settings = get_settings()
    
    if not settings.resend_api_key:
        logger.warning("No resend_api_key provided, skipping email notification.")
        return
        
    resend.api_key = settings.resend_api_key
    from_email = getattr(settings, "from_email", "Ariadne <onboarding@resend.dev>")
    
    dashboard_url = f"{settings.frontend_url}/dashboard/pipeline/{run_id}"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #111;">Your Career Labyrinth has been navigated!</h2>
        <p>Good news! Our AI agents have finished processing your profile and finding the best match.</p>
        <p>You can view the final results, including your gap analysis and custom cover letter, on your dashboard:</p>
        <p style="margin: 24px 0;">
          <a href="{dashboard_url}" style="display: inline-block; padding: 12px 24px; color: #fff; background-color: #111; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Results
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="{dashboard_url}" style="color: #0066cc;">{dashboard_url}</a></p>
        <br />
        <p>Best regards,<br/><strong>The Ariadne AI Team</strong></p>
      </body>
    </html>
    """
    
    try:
        # resend.Emails.send is a synchronous call in the official SDK, but we run it in an async context.
        # It's usually fast enough, but ideally could be run in a threadpool.
        response = resend.Emails.send({
            "from": from_email,
            "to": user_email,
            "subject": "Ariadne: Your pipeline is complete \U0001f389",
            "html": html_content
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
        
        if user_email:
            await send_pipeline_completion_email(user_email, run_id)
        else:
            logger.warning(f"Could not find email for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to notify user {user_id} of completion: {e}")
