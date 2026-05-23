"""Tests for the analytics tracking layer."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.analytics import track_event, track_event_bg, Events


@pytest.fixture
def mock_supabase():
    mock = MagicMock()
    mock.table = MagicMock()
    # Ensure execute is an AsyncMock
    mock.table.return_value.insert.return_value.execute = AsyncMock()
    return mock


@pytest.mark.asyncio
async def test_track_event(mock_supabase):
    await track_event(
        supabase=mock_supabase,
        user_id="user-123",
        event_name=Events.PIPELINE_STARTED,
        properties={"mode": "explore"},
    )
    
    mock_supabase.table.assert_called_with("analytics_events")
    mock_supabase.table.return_value.insert.assert_called_once()
    
    # Verify the inserted data structure
    insert_call_args = mock_supabase.table.return_value.insert.call_args[0][0]
    assert insert_call_args["user_id"] == "user-123"
    assert insert_call_args["event_name"] == Events.PIPELINE_STARTED
    assert insert_call_args["event_properties"] == {"mode": "explore"}
    assert "created_at" in insert_call_args


@pytest.mark.asyncio
async def test_track_event_suppresses_errors(mock_supabase, caplog):
    # Make the insert fail
    mock_supabase.table.return_value.insert.return_value.execute.side_effect = Exception("DB error")
    
    # Should not raise
    await track_event(mock_supabase, "user-1", Events.USER_LOGIN)
    
    assert "Failed to track event" in caplog.text


def test_track_event_bg(mock_supabase):
    with patch("asyncio.create_task") as mock_create_task:
        track_event_bg(mock_supabase, "user-1", Events.USER_LOGIN)
        
        mock_create_task.assert_called_once()
