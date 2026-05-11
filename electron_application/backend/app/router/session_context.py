"""
Session context routes used to store the latest game + Riot ID selection
for local tooling (e.g. pop_up_screen.py).
"""

import json
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/session", tags=["SessionContext"])


class SessionContextUpdate(BaseModel):
    riot_id: str
    game: str
    user_id: Optional[int] = None


def _session_context_path() -> str:
    base_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..")
    )
    return os.path.join(
        base_dir, "research_software", "data", "json", "session_context.json"
    )


def _normalize_game(game: str) -> str:
    normalized = game.strip().lower()
    if normalized in {"lol", "league", "league of legends", "league_of_legends"}:
        return "league_of_legends"
    if normalized in {"valorant", "val"}:
        return "valorant"
    return normalized


@router.post("/context")
async def save_session_context(payload: SessionContextUpdate):
    if not payload.riot_id:
        raise HTTPException(status_code=400, detail="Riot ID is required")
    if not payload.game:
        raise HTTPException(status_code=400, detail="Game is required")

    riot_id = payload.riot_id.strip()
    if "#" not in riot_id:
        raise HTTPException(status_code=400, detail="Invalid Riot ID format (name#tag)")

    player_name = riot_id.split("#", 1)[0].strip()
    if not player_name:
        raise HTTPException(status_code=400, detail="Invalid Riot ID format (name#tag)")

    context = {
        "riot_id": riot_id,
        "player_name": player_name,
        "game": payload.game.strip().lower(),
        "normalized_game": _normalize_game(payload.game),
        "user_id": payload.user_id,
        "updated_at": datetime.utcnow().isoformat(),
    }

    context_path = _session_context_path()
    os.makedirs(os.path.dirname(context_path), exist_ok=True)

    with open(context_path, "w", encoding="utf-8") as file:
        json.dump(context, file, indent=2)

    return {"success": True, "context": context}
