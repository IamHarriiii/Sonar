import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StarfieldCanvas from "../../components/StarfieldCanvas";
import useAuthStore from "../../stores/useAuthStore";
import "./DashboardPage.css";

const MOCK_PLAYLISTS = [
  {
    id: 1,
    title: "Midnight Drift",
    mood: "Melancholy",
    moodEmoji: "🌧",
    tracks: 14,
    duration: "52 min",
    gradient: "linear-gradient(135deg, #1a0533 0%, #0d1a33 100%)",
    accent: "#7c4dff",
    date: "Today",
  },
  {
    id: 2,
    title: "Solar Rush",
    mood: "Energetic",
    moodEmoji: "⚡",
    tracks: 18,
    duration: "1h 4min",
    gradient: "linear-gradient(135deg, #330a00 0%, #1a1500 100%)",
    accent: "#ff6b00",
    date: "Yesterday",
  },
  {
    id: 3,
    title: "Cotton Cloud",
    mood: "Calm",
    moodEmoji: "😌",
    tracks: 11,
    duration: "41 min",
    gradient: "linear-gradient(135deg, #001a1a 0%, #001133 100%)",
    accent: "#00d4aa",
    date: "2 days ago",
  },
  {
    id: 4,
    title: "Golden Hour",
    mood: "Happy",
    moodEmoji: "😊",
    tracks: 16,
    duration: "58 min",
    gradient: "linear-gradient(135deg, #1a1100 0%, #1a0a00 100%)",
    accent: "#ffcc00",
    date: "3 days ago",
  },
  {
    id: 5,
    title: "Neon Pulse",
    mood: "Energetic",
    moodEmoji: "⚡",
    tracks: 20,
    duration: "1h 12min",
    gradient: "linear-gradient(135deg, #1a0033 0%, #001a33 100%)",
    accent: "#ff3c64",
    date: "4 days ago",
  },
  {
    id: 6,
    title: "Velvet Rain",
    mood: "Romantic",
    moodEmoji: "💕",
    tracks: 13,
    duration: "48 min",
    gradient: "linear-gradient(135deg, #1a0011 0%, #0d0033 100%)",
    accent: "#ff6bbb",
    date: "5 days ago",
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const displayName = user?.username || "User";
  const displayInitial = displayName.charAt(0).toUpperCase();
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("account");
  const profileRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <div className="db-root">
      <StarfieldCanvas starCount={60} />
      <div className="db-glow db-glow-1" />
      <div className="db-glow db-glow-2" />

      {/* ── Navbar ── */}
      <nav className="db-nav">
        <div className="db-nav-inner">
          <div className="db-nav-logo" onClick={() => navigate("/")}>
            <span className="db-nav-logo-icon">🎵</span>
            <span className="db-nav-logo-text">Sonar</span>
          </div>

          <div className="db-nav-center">
            <span className="db-nav-tag">Your Library</span>
          </div>

          {/* Profile box */}
          <div className="db-profile-wrap" ref={profileRef}>
            <button
              className="db-profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-label="User profile menu"
            >
              <div className="db-avatar">
                <span>{displayInitial}</span>
                <div className="db-avatar-ring" />
              </div>
              <span className="db-username">{displayName}</span>
              <svg
                className={`db-chevron ${profileOpen ? "db-chevron--open" : ""}`}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {profileOpen && (
              <div className="db-dropdown">
                <div className="db-dropdown-header">
                  <div className="db-dropdown-avatar">{displayInitial}</div>
                  <div>
                    <p className="db-dropdown-name">{displayName}</p>
                    <p className="db-dropdown-email">@{displayName}</p>
                  </div>
                </div>
                <div className="db-dropdown-divider" />
                <button
                  className="db-dropdown-item"
                  onClick={() => { setSettingsOpen(true); setProfileOpen(false); }}
                >
                  <span className="db-dropdown-icon">⚙️</span> Settings
                </button>
                <button className="db-dropdown-item">
                  <span className="db-dropdown-icon">🎨</span> Appearance
                </button>
                <button className="db-dropdown-item">
                  <span className="db-dropdown-icon">🔔</span> Notifications
                </button>
                <button className="db-dropdown-item">
                  <span className="db-dropdown-icon">❓</span> Help & Support
                </button>
                <div className="db-dropdown-divider" />
                <button className="db-dropdown-item db-dropdown-item--danger" onClick={handleSignOut}>
                  <span className="db-dropdown-icon">🚪</span> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="db-main">
        {/* Hero greeting */}
        <section className="db-hero">
          <div className="db-hero-text">
            <p className="db-greeting-label">Good evening</p>
            <h1 className="db-greeting">
              How are you <span className="db-greeting-accent">feeling</span> today?
            </h1>
            <p className="db-greeting-sub">
              Your AI knows your mood before you do. Let it build you the perfect soundtrack.
            </p>
          </div>

          {/* Generate New Playlist CTA */}
          <button
            className="db-generate-btn"
            onClick={() => navigate("/analyze")}
            aria-label="Generate a new playlist"
          >
            <div className="db-generate-btn-glow" />
            <div className="db-generate-btn-inner">
              <div className="db-generate-icon-wrap">
                <span className="db-generate-icon">✦</span>
              </div>
              <div className="db-generate-text">
                <span className="db-generate-label">Generate New Playlist</span>
                <span className="db-generate-sub">Analyze your mood → instant soundtrack</span>
              </div>
              <svg className="db-generate-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="db-generate-shimmer" />
          </button>
        </section>

        

        {/* ── Playlists Grid ── */}
        <section className="db-playlists">
          <div className="db-playlists-header">
            <h2 className="db-section-title">Your Generated Playlists</h2>
            <span className="db-playlist-count">{MOCK_PLAYLISTS.length} playlists</span>
          </div>

          <div className="db-grid">
            {MOCK_PLAYLISTS.map((pl) => (
              <div key={pl.id} className="db-card" style={{ "--card-accent": pl.accent }}>
                <div className="db-card-art" style={{ background: pl.gradient }}>
                  <div className="db-card-vinyl">
                    <div className="db-card-vinyl-inner" />
                  </div>
                  <div className="db-card-play">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                      <path d="M6 3.5l9 5.5-9 5.5V3.5z" />
                    </svg>
                  </div>
                  <div className="db-card-glow" style={{ background: pl.accent }} />
                </div>
                <div className="db-card-info">
                  <div className="db-card-mood-chip" style={{ color: pl.accent, borderColor: `${pl.accent}33`, background: `${pl.accent}11` }}>
                    {pl.moodEmoji} {pl.mood}
                  </div>
                  <h3 className="db-card-title">{pl.title}</h3>
                  <div className="db-card-meta">
                    <span>{pl.tracks} tracks</span>
                    <span className="db-card-dot">·</span>
                    <span>{pl.duration}</span>
                    <span className="db-card-dot">·</span>
                    <span className="db-card-date">{pl.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="db-footer">
        <div className="db-footer-inner">
          <div className="db-footer-brand">
            <span className="db-nav-logo-icon">🎵</span>
            <span className="db-nav-logo-text">Sonar</span>
            <p className="db-footer-desc">AI-powered emotion-aware music platform.</p>
          </div>
          <div className="db-footer-links">
            <div className="db-footer-col">
              <h4>Product</h4>
              <a href="#">Features</a>
              <a href="#">How It Works</a>
            </div>
            <div className="db-footer-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
        <div className="db-footer-bottom">
          <p>© 2026 Sonar. All rights reserved.</p>
        </div>
      </footer>

      {/* ── Settings Modal ── */}
      {settingsOpen && (
        <div className="db-modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-header">
              <h2 className="db-modal-title">Settings</h2>
              <button
                className="db-modal-close"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <div className="db-modal-body">
              <div className="db-modal-sidebar">
                {[
                  { id: "account", icon: "👤", label: "Account" },
                  { id: "appearance", icon: "🎨", label: "Appearance" },
                  { id: "notifications", icon: "🔔", label: "Notifications" },
                  { id: "privacy", icon: "🔒", label: "Privacy" },
                  { id: "audio", icon: "🎵", label: "Audio" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`db-modal-tab ${activeSettingsTab === tab.id ? "db-modal-tab--active" : ""}`}
                    onClick={() => setActiveSettingsTab(tab.id)}
                  >
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </div>

              <div className="db-modal-content">
                {activeSettingsTab === "account" && (
                  <div className="db-settings-section">
                    <h3>Account Details</h3>
                    <div className="db-settings-row">
                      <div className="db-settings-avatar-big">{displayInitial}</div>
                      <div>
                        <p className="db-settings-name">{displayName}</p>
                        <button className="db-settings-change-avatar">Change avatar</button>
                      </div>
                    </div>
                    <div className="db-settings-field">
                      <label>Username</label>
                      <input type="text" defaultValue={displayName} />
                    </div>
                    <div className="db-settings-field">
                      <label>Email</label>
                      <input type="email" placeholder="No email set" />
                    </div>
                    <button className="db-settings-save">Save Changes</button>
                    <div className="db-settings-danger-zone">
                      <h4>Danger Zone</h4>
                      <button className="db-settings-delete">Delete Account</button>
                    </div>
                  </div>
                )}
                {activeSettingsTab === "appearance" && (
                  <div className="db-settings-section">
                    <h3>Appearance</h3>
                    <p className="db-settings-desc">Customize how Sonar looks for you.</p>
                    <div className="db-settings-field">
                      <label>Theme</label>
                      <div className="db-settings-theme-options">
                        <div className="db-theme-option db-theme-option--active">
                          <div className="db-theme-preview db-theme-preview--dark" />
                          <span>Dark</span>
                        </div>
                        <div className="db-theme-option">
                          <div className="db-theme-preview db-theme-preview--amoled" />
                          <span>AMOLED</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {["notifications", "privacy", "audio"].includes(activeSettingsTab) && (
                  <div className="db-settings-section">
                    <h3 style={{ textTransform: "capitalize" }}>{activeSettingsTab}</h3>
                    <p className="db-settings-desc">Settings for this section coming soon.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}