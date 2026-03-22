"""
Mood Service — orchestrates LLM emotion analysis + Spotify playlist generation.

This is the high-level service called by routes. It delegates to:
  - llm_service.analyze_emotion() for text → emotion
  - spotify_service.get_recommendations() for emotion → playlist
"""

import logging

from services.llm_service import analyze_emotion
from services.spotify_service import get_recommendations

logger = logging.getLogger("sonar.mood")


async def analyze_mood(text: str) -> dict:
    """Analyze text and return structured emotion analysis."""
    return await analyze_emotion(text)


async def generate_playlist(
    dimensions: list[dict],
    preference: str = "match",
    languages: list[str] | None = None,
    artists: list[str] | None = None,
    intensity: int = 50,
    track_count: int = 15,
    genre: str = "pop",
    base_emotion: str = "Calm",
) -> dict:
    """Generate a Spotify playlist based on mood analysis results."""
    tracks = await get_recommendations(
        genre=genre,
        languages=languages,
        artists=artists,
        intensity=intensity,
        track_count=track_count,
        preference=preference,
        base_emotion=base_emotion,
    )

    # Determine playlist name from emotion + genre
    title = f"{base_emotion} · {genre.title()}"

    return {"title": title, "tracks": tracks}
