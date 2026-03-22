import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import PageLayout from "../../components/PageLayout";
import "./PlaylistPage.css";

export default function PlaylistPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state;
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // Redirect if accessed directly
  useEffect(() => {
    if (!data?.playlist) {
      navigate("/analyze", { replace: true });
    }
  }, [data, navigate]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = (track) => {
    if (!track.preview_url) return;

    if (playingId === track.id) {
      // Pause current
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Play new
    const audio = new Audio(track.preview_url);
    audio.volume = 0.5;
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(track.id);
  };

  if (!data?.playlist) return null;

  const { playlist, analysis, preference, settings } = data;

  return (
    <PageLayout>
      <Navbar centerLabel="Your Playlist" showBack backTo="/result" />

      <main className="pl-main">
        <div className="pl-content">

          {/* ── Hero ── */}
          <section className="pl-hero">
            <div className="pl-hero-orb">
              <div className="pl-hero-ring pl-hero-ring-1" />
              <div className="pl-hero-ring pl-hero-ring-2" />
              <div className="pl-hero-core">
                {analysis?.moodEmoji || "🎵"}
              </div>
            </div>
            <h1 className="pl-hero-title">{playlist.title}</h1>
            <p className="pl-hero-sub">
              {playlist.tracks.length} tracks
              {preference === "uplift" ? " • Uplifting" : " • Mood-matched"}
              {settings?.languages?.length > 0 && ` • ${settings.languages.join(", ")}`}
            </p>
          </section>

          {/* ── Settings Summary ── */}
          <div className="pl-settings-bar">
            <div className="pl-setting">
              <span className="pl-setting-icon">🎚</span>
              <span className="pl-setting-text">
                {settings?.intensity < 33 ? "Soft" : settings?.intensity < 66 ? "Balanced" : "Strong"}
              </span>
            </div>
            <div className="pl-setting-divider" />
            <div className="pl-setting">
              <span className="pl-setting-icon">🎵</span>
              <span className="pl-setting-text">{playlist.tracks.length} tracks</span>
            </div>
            <div className="pl-setting-divider" />
            <div className="pl-setting">
              <span className="pl-setting-icon">
                {preference === "uplift" ? "🌟" : "🎭"}
              </span>
              <span className="pl-setting-text">
                {preference === "uplift" ? "Uplift" : "Match"}
              </span>
            </div>
          </div>

          {/* ── Track List ── */}
          <section className="pl-tracklist">
            {playlist.tracks.length > 0 ? (
              playlist.tracks.map((track, i) => (
                <div
                  key={track.id}
                  className={`pl-track ${playingId === track.id ? "pl-track--playing" : ""}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="pl-track-num">{String(i + 1).padStart(2, "0")}</div>

                  {/* Album art or color accent */}
                  {track.album_art ? (
                    <img
                      src={track.album_art}
                      alt={track.title}
                      className="pl-track-art"
                      loading="lazy"
                    />
                  ) : (
                    <div className="pl-track-accent" style={{ background: track.color }} />
                  )}

                  <div className="pl-track-info">
                    <span className="pl-track-title">{track.title}</span>
                    <span className="pl-track-artist">{track.artist}</span>
                  </div>

                  <span className="pl-track-duration">{track.duration}</span>

                  {/* Play/pause button — only if preview available */}
                  {track.preview_url ? (
                    <button
                      className={`pl-track-play ${playingId === track.id ? "pl-track-play--active" : ""}`}
                      onClick={() => handlePlay(track)}
                      aria-label={playingId === track.id ? `Pause ${track.title}` : `Play ${track.title}`}
                    >
                      {playingId === track.id ? (
                        <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                          <rect x="0" y="0" width="3" height="12" />
                          <rect x="7" y="0" width="3" height="12" />
                        </svg>
                      ) : (
                        <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                          <path d="M0 0L12 7L0 14V0Z" />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <a
                      href={track.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pl-track-play pl-track-play--spotify"
                      aria-label={`Open ${track.title} on Spotify`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="pl-empty">
                <p>No tracks matched your criteria. Try adjusting your preferences.</p>
              </div>
            )}
          </section>

          {/* ── Actions ── */}
          <div className="pl-actions">
            <button
              className="pl-action-btn pl-action-btn--primary"
              onClick={() => navigate("/analyze")}
            >
              ✦ New Analysis
            </button>
            <button
              className="pl-action-btn pl-action-btn--secondary"
              onClick={() => navigate(-1)}
            >
              ← Back to Results
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </PageLayout>
  );
}
