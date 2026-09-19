"""Cut 2 URL seed side-effect — enqueue ATS boards, skip non-ATS, never raise."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.tools.job_engine_seed import seed_board_from_url, seed_boards_from_urls


@pytest.mark.asyncio
async def test_seed_board_enqueues_job_engine_job() -> None:
    pool = MagicMock()
    pool.enqueue_job = AsyncMock(return_value=MagicMock(job_id="jid"))
    pool.aclose = AsyncMock()

    with (
        patch("app.tools.job_engine_seed.get_settings") as settings,
        patch("app.tools.job_engine_seed.create_pool", new=AsyncMock(return_value=pool)),
    ):
        settings.return_value.redis_url = "redis://localhost:6379"
        await seed_board_from_url("https://boards.greenhouse.io/showpad/jobs/1")

    pool.enqueue_job.assert_awaited_once()
    args, kwargs = pool.enqueue_job.await_args
    assert args[0] == "job_seed_url"
    assert "showpad" in args[1]
    assert kwargs["_job_id"].startswith("url-seed:")


@pytest.mark.asyncio
async def test_seed_board_skips_non_ats() -> None:
    with patch("app.tools.job_engine_seed.create_pool", new=AsyncMock()) as create:
        await seed_board_from_url("https://www.linkedin.com/jobs/view/123")
        await seed_board_from_url("https://www.indeed.com/viewjob?jk=abc")
        await seed_board_from_url("https://acme.jobs.personio.de/job/1")
        create.assert_not_called()


@pytest.mark.asyncio
async def test_seed_boards_dedupes_same_slug() -> None:
    pool = MagicMock()
    pool.enqueue_job = AsyncMock(return_value=MagicMock(job_id="jid"))
    pool.aclose = AsyncMock()

    with (
        patch("app.tools.job_engine_seed.get_settings") as settings,
        patch("app.tools.job_engine_seed.create_pool", new=AsyncMock(return_value=pool)),
    ):
        settings.return_value.redis_url = "redis://localhost:6379"
        await seed_boards_from_urls(
            [
                "https://boards.greenhouse.io/showpad/jobs/1",
                "https://boards.greenhouse.io/showpad/jobs/2",
                "https://jobs.lever.co/collibra/abc",
            ]
        )

    assert pool.enqueue_job.await_count == 2


@pytest.mark.asyncio
async def test_seed_board_swallows_redis_errors() -> None:
    with (
        patch("app.tools.job_engine_seed.get_settings") as settings,
        patch(
            "app.tools.job_engine_seed.create_pool",
            new=AsyncMock(side_effect=ConnectionError("down")),
        ),
    ):
        settings.return_value.redis_url = "redis://localhost:6379"
        await seed_board_from_url("https://jobs.lever.co/netlify/abc")
