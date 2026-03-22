import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { moodApi } from "../../services/api";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import PageLayout from "../../components/PageLayout";
import "./ResultPage.css";

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const analysisData = location.state?.analysis;

  const [preference, setPreference] = useState(null); // "match" | "uplift" | null
  const [playlist, setPlaylist] = useState(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const playlistRef = useRef(null);

  // Redirect if no analysis data (direct URL visit)
  useEffect(() => {
    if (!analysisData) {
      navigate("/analyze", { replace: true });
    }
  }, [analysisData, navigate]);

  // Fetch playlist when user picks preference
  const handlePreference = async (pref) => {
    setPreference(pref);
    setLoadingPlaylist(true);
    try {
      const data = await moodApi.playlist(analysisData.dimensions, pref);
      setPlaylist(data);
    } catch {
      // Fallback — still show something
      setPlaylist({
        title: pref === "uplift" ? "Silver Linings" : "Midnight Drift",
        tracks: [],
      });
    } finally {
      setLoadingPlaylist(false);
      // Scroll to playlist after render
      setTimeout(() => {
        playlistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  if (!analysisData) return null;

  const { mood, moodEmoji, nuance, sentiment, confidence, explanation, dimensions } = analysisData;

  // Sentiment color mapping
  const sentimentColors = {
    Positive: { bg: "rgba(74, 222, 128, 0.08)", border: "rgba(74, 222, 128, 0.25)", text: "#4ade80" },
    Negative: { bg: "rgba(255, 60, 100, 0.08)", border: "rgba(255, 60, 100, 0.25)", text: "#ff6b8a" },
    Mixed: { bg: "rgba(201, 109, 255, 0.08)", border: "rgba(201, 109, 255, 0.25)", text: "#c96dff" },
    Neutral: { bg: "rgba(255, 255, 255, 0.05)", border: "rgba(255, 255, 255, 0.15)", text: "rgba(255,255,255,0.5)" },
  };
  const sc = sentimentColors[sentiment] || sentimentColors.Neutral;

  return (
    <PageLayout>
      <Navbar centerLabel="Analysis" showBack backTo="/analyze" />

      <main className="rp-main">
        <div className="rp-content">

          {/* ── Section: Your Emotional State ── */}
          <section className="rp-emotion-section">
            <div className="rp-section-badge">ANALYSIS COMPLETE</div>
            <h1 className="rp-section-title">Your emotional state</h1>
            <p className="rp-section-subtitle">Here's what we detected from what you shared.</p>

            {/* 3 Emotion Cards */}
            <div className="rp-emotion-cards">
              <div className="rp-card">
                <div className="rp-card-emoji">{moodEmoji}</div>
                <div className="rp-card-label">Primary Emotion</div>
                <div className="rp-card-value">{mood}</div>
              </div>
              <div className="rp-card">
                <div className="rp-card-icon">✦</div>
                <div className="rp-card-label">Nuance</div>
                <div className="rp-card-value">{nuance}</div>
              </div>
              <div className="rp-card" style={{ background: sc.bg, borderColor: sc.border }}>
                <div className="rp-card-icon" style={{ color: sc.text }}>◎</div>
                <div className="rp-card-label">Sentiment</div>
                <div className="rp-card-value" style={{ color: sc.text }}>{sentiment}</div>
              </div>
            </div>

            {/* Confidence */}
            <div className="rp-confidence">
              <div className="rp-confidence-header">
                <span className="rp-confidence-label">Confidence</span>
                <span className="rp-confidence-pct">{confidence}%</span>
              </div>
              <div className="rp-confidence-track">
                <div className="rp-confidence-fill" style={{ width: `${confidence}%` }} />
              </div>
            </div>
          </section>

          {/* ── Section: Explanation ── */}
          <section className="rp-explanation-section">
            <h2 className="rp-explanation-title">Why this emotion?</h2>
            <p className="rp-explanation-text">{explanation}</p>
          </section>

          {/* ── Section: Emotional Spectrum ── */}
          <section className="rp-spectrum-section">
            <h2 className="rp-spectrum-title">Emotional spectrum</h2>
            <div className="rp-dimensions">
              {dimensions.map((d) => (
                <div key={d.name} className="rp-dim">
                  <div className="rp-dim-header">
                    <span className="rp-dim-name">{d.name}</span>
                    <span className="rp-dim-val">{d.value}%</span>
                  </div>
                  <div className="rp-dim-track">
                    <div
                      className="rp-dim-fill"
                      style={{ width: `${d.value}%`, background: d.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section: Music Preference ── */}
          {!preference && (
            <section className="rp-preference-section">
              <h2 className="rp-preference-title">How would you like your music?</h2>
              <p className="rp-preference-subtitle">Choose how we should curate your playlist.</p>
              <div className="rp-preference-options">
                <button
                  className="rp-pref-btn rp-pref-btn--match"
                  onClick={() => handlePreference("match")}
                >
                  <span className="rp-pref-emoji">🎭</span>
                  <span className="rp-pref-label">Match my current mood</span>
                  <span className="rp-pref-desc">Songs that resonate with how you feel right now</span>
                </button>
                <button
                  className="rp-pref-btn rp-pref-btn--uplift"
                  onClick={() => handlePreference("uplift")}
                >
                  <span className="rp-pref-emoji">🌟</span>
                  <span className="rp-pref-label">Uplift my mood</span>
                  <span className="rp-pref-desc">Songs to gently shift your energy upward</span>
                </button>
              </div>
            </section>
          )}

          {/* ── Section: Playlist ── */}
          {preference && (
            <section className="rp-playlist-section" ref={playlistRef}>
              {loadingPlaylist ? (
                <div className="rp-playlist-loading">
                  <div className="rp-loading-orb">
                    <div className="rp-loading-ring rp-loading-ring-1" />
                    <div className="rp-loading-ring rp-loading-ring-2" />
                    <div className="rp-loading-core">🎵</div>
                  </div>
                  <p className="rp-loading-text">Curating your playlist...</p>
                </div>
              ) : playlist && (
                <>
                  <div className="rp-playlist-header">
                    <h2 className="rp-playlist-title">{playlist.title}</h2>
                    <span className="rp-playlist-count">{playlist.tracks.length} tracks</span>
                  </div>
                  <div className="rp-tracks">
                    {playlist.tracks.map((track, i) => (
                      <div key={track.id} className="rp-track">
                        <div className="rp-track-num">{String(i + 1).padStart(2, "0")}</div>
                        <div className="rp-track-color" style={{ background: track.color }} />
                        <div className="rp-track-info">
                          <span className="rp-track-title">{track.title}</span>
                          <span className="rp-track-artist">{track.artist}</span>
                        </div>
                        <span className="rp-track-dur">{track.duration}</span>
                        <button className="rp-track-play" aria-label={`Play ${track.title}`}>▶</button>
                      </div>
                    ))}
                  </div>
                  <div className="rp-actions">
                    <button className="rp-action-btn rp-action-btn--primary" onClick={() => navigate("/analyze")}>
                      ✦ New Analysis
                    </button>
                    <button className="rp-action-btn rp-action-btn--secondary" onClick={() => {
                      setPreference(null);
                      setPlaylist(null);
                    }}>
                      ↻ Change Preference
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </main>

      <Footer />
    </PageLayout>
  );
}