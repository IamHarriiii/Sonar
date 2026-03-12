import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import StarfieldCanvas from "../../components/StarfieldCanvas";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const vinylRef = useRef(null);

  // Spin the disc using requestAnimationFrame
  useEffect(() => {
    let angle = 0;
    let animId;
    const spin = () => {
      angle += 0.4;
      if (vinylRef.current) {
        vinylRef.current.style.transform = `rotate(${angle}deg)`;
      }
      animId = requestAnimationFrame(spin);
    };
    animId = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="lp-root">
      <StarfieldCanvas />

      {/* Ambient glows */}
      <div className="lp-glow lp-glow-1" />
      <div className="lp-glow lp-glow-2" />
      <div className="lp-glow lp-glow-3" />

      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-logo">
            <span className="lp-nav-logo-icon">🎵</span>
            <span className="lp-nav-logo-text">Sonar</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#how-it-works" className="lp-nav-link">How It Works</a>
          </div>
          <button className="lp-nav-cta" onClick={() => navigate("/auth")}>
            Get Started
          </button>
        </div>
      </nav>

      <main>
        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-hero-left">
            <div className="lp-badge" role="text">✦ AI-POWERED · EMOTION-AWARE</div>
            <h1 className="lp-headline">
              Music that <br />
              <span className="lp-highlight">feels</span> what <br />
              you feel.
            </h1>
            <p className="lp-sub">
              Share your emotions through text or voice. Our AI detects how
              you're feeling and crafts the perfect playlist to match or
              transform your mood — in real time.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-cta" onClick={() => navigate("/auth")}>
                Start Listening →
              </button>
              <a href="#how-it-works" className="lp-cta-secondary">
                See How It Works
              </a>
            </div>

            {/* Floating mood tags */}
            <div className="lp-mood-tags">
              <span className="lp-mood-tag lp-mood-tag--happy">😊 Happy</span>
              <span className="lp-mood-tag lp-mood-tag--chill">😌 Chill</span>
              <span className="lp-mood-tag lp-mood-tag--energetic">⚡ Energetic</span>
              <span className="lp-mood-tag lp-mood-tag--melancholy">🌧 Melancholy</span>
              <span className="lp-mood-tag lp-mood-tag--romantic">💕 Romantic</span>
            </div>
          </div>

          <div className="lp-hero-right">
            <div className="lp-vinyl-wrapper">
              {/* Outer glow ring */}
              <div className="lp-vinyl-glow" />
              <div className="lp-vinyl-card">
                <div className="lp-vinyl-disc" ref={vinylRef}>
                  <div className="lp-vinyl-grooves" />
                  <div className="lp-vinyl-center" />
                </div>
                <div className="lp-tonearm" />
                <div className="lp-now-playing-badge">♪ Now Playing</div>
              </div>
              <div className="lp-equalizer" role="img" aria-label="Audio equalizer animation">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`lp-eq-bar lp-eq-bar-${i + 1}`} />
                ))}
              </div>
              <p className="lp-tagline">Your emotions, amplified.</p>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ── */}
        <section className="lp-stats">
          <div className="lp-stat">
            <span className="lp-stat-num">50K+</span>
            <span className="lp-stat-label">Playlists Generated</span>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat">
            <span className="lp-stat-num">12</span>
            <span className="lp-stat-label">Mood Categories</span>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat">
            <span className="lp-stat-num">98%</span>
            <span className="lp-stat-label">Accuracy Rate</span>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat">
            <span className="lp-stat-num">24/7</span>
            <span className="lp-stat-label">Always Listening</span>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="lp-features" id="features" aria-label="Features">
          <div className="lp-section-header">
            <span className="lp-section-tag">FEATURES</span>
            <h2 className="lp-section-title">
              Everything you need for <br />
              <span className="lp-highlight">emotion-driven</span> music
            </h2>
            <p className="lp-section-desc">
              Our platform combines cutting-edge AI with music intelligence
              to deliver a truly personalized listening experience.
            </p>
          </div>
          <div className="lp-cards">
            <div className="lp-card">
              <div className="lp-card-icon-wrap lp-card-icon--emotion">
                <span>🎭</span>
              </div>
              <h3>Emotion Analysis</h3>
              <p>
                Advanced AI sentiment detection reads between the lines of
                what you share to understand your true emotional state with
                remarkable precision.
              </p>
              <div className="lp-card-shine" />
            </div>
            <div className="lp-card">
              <div className="lp-card-icon-wrap lp-card-icon--playlist">
                <span>🎵</span>
              </div>
              <h3>Smart Playlists</h3>
              <p>
                Tracks curated in real-time to either match your current mood
                or gently guide you toward a brighter, more productive
                headspace.
              </p>
              <div className="lp-card-shine" />
            </div>
            <div className="lp-card">
              <div className="lp-card-icon-wrap lp-card-icon--voice">
                <span>🎤</span>
              </div>
              <h3>Voice Input</h3>
              <p>
                Just speak your mind naturally. Our transcription engine and
                emotion AI handle everything — no typing required.
              </p>
              <div className="lp-card-shine" />
            </div>
            <div className="lp-card">
              <div className="lp-card-icon-wrap lp-card-icon--history">
                <span>📊</span>
              </div>
              <h3>Mood History</h3>
              <p>
                Track your emotional journey over time. Visualize patterns,
                discover trends, and understand yourself through music.
              </p>
              <div className="lp-card-shine" />
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="lp-how" id="how-it-works">
          <div className="lp-section-header">
            <span className="lp-section-tag">HOW IT WORKS</span>
            <h2 className="lp-section-title">
              Three steps to your <br />
              <span className="lp-highlight">perfect</span> playlist
            </h2>
          </div>
          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num">01</div>
              <div className="lp-step-content">
                <h3>Share Your Mood</h3>
                <p>
                  Type or speak how you're feeling. Be as expressive as you
                  want — our AI understands nuance, context, and emotional
                  subtlety.
                </p>
              </div>
            </div>
            <div className="lp-step-connector" />
            <div className="lp-step">
              <div className="lp-step-num">02</div>
              <div className="lp-step-content">
                <h3>AI Analysis</h3>
                <p>
                  Our emotion engine detects your mood across 12 dimensions —
                  from joy and excitement to nostalgia and calm — in under
                  a second.
                </p>
              </div>
            </div>
            <div className="lp-step-connector" />
            <div className="lp-step">
              <div className="lp-step-num">03</div>
              <div className="lp-step-content">
                <h3>Hit Play</h3>
                <p>
                  Receive a perfectly curated playlist that either mirrors
                  your emotions or shifts your mood toward where you want
                  to be. Just press play.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="lp-cta-banner">
          <div className="lp-cta-banner-glow" />
          <h2>Ready to feel the music?</h2>
          <p>Join thousands of listeners who've discovered a more personal way to experience music.</p>
          <button className="lp-cta lp-cta--large" onClick={() => navigate("/auth")}>
            Get Started Free →
          </button>
        </section>

        {/* ── Footer ── */}
        <footer className="lp-footer">
          <div className="lp-footer-inner">
            <div className="lp-footer-brand">
              <span className="lp-nav-logo-icon">🎵</span>
              <span className="lp-nav-logo-text">Sonar</span>
              <p className="lp-footer-desc">AI-powered emotion-aware music platform.</p>
            </div>
            <div className="lp-footer-links">
              <div className="lp-footer-col">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
              </div>
              <div className="lp-footer-col">
                <h4>Company</h4>
                <a href="#">About</a>
                <a href="#">Contact</a>
              </div>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <p>© 2026 Sonar. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}