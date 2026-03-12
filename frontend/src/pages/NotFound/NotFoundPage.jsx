import { Link } from "react-router-dom";
import StarfieldCanvas from "../../components/StarfieldCanvas";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  return (
    <div className="nf-root">
      <StarfieldCanvas starCount={80} />
      <div className="nf-center">
        <div className="nf-vinyl" role="img" aria-label="Vinyl record">💿</div>
        <div className="nf-code">404</div>
        <h1 className="nf-title">Track Not Found</h1>
        <p className="nf-desc">
          Looks like this page skipped a beat. Let's get you back to the music.
        </p>
        <Link to="/" className="nf-btn">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
