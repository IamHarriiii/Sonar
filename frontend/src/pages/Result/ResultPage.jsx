import { useNavigate } from "react-router-dom";
import StarfieldCanvas from "../../components/StarfieldCanvas";
import "./ResultPage.css";

export default function ResultPage() {
  const navigate = useNavigate();

  return (
    <div className="rp-root">
      <StarfieldCanvas starCount={55} />
      <div className="rp-glow rp-glow-1" />
      <div className="rp-glow rp-glow-2" />

      {/* ── Navbar ── */}
      <nav className="rp-nav">
        <div className="rp-nav-inner">
          <div className="rp-nav-logo" onClick={() => navigate("/dashboard")}>
            <span className="rp-nav-logo-icon">🎵</span>
            <span className="rp-nav-logo-text">Sonar</span>
          </div>
          <div className="rp-nav-center">
            <span className="rp-nav-tag">Your Playlist</span>
          </div>
          <button className="rp-nav-back" onClick={() => navigate("/dashboard")}>
            ← Back to Library
          </button>
        </div>
      </nav>

      {/* ── Content (blank — to be built) ── */}
      <main className="rp-main">
        {/* Result content goes here */}
      </main>

      {/* ── Footer ── */}
      <footer className="rp-footer">
        <div className="rp-footer-inner">
          <div className="rp-footer-brand">
            <span className="rp-nav-logo-icon">🎵</span>
            <span className="rp-nav-logo-text">Sonar</span>
            <p className="rp-footer-desc">AI-powered emotion-aware music platform.</p>
          </div>
          <div className="rp-footer-links">
            <div className="rp-footer-col">
              <h4>Product</h4>
              <a href="#">Features</a>
              <a href="#">How It Works</a>
            </div>
            <div className="rp-footer-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
        <div className="rp-footer-bottom">
          <p>© 2026 Sonar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}