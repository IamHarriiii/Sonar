import { Navigate } from "react-router-dom";
import useAuthStore from "../stores/useAuthStore";

/**
 * Wraps a route that requires authentication.
 * Redirects to /auth if user is not logged in.
 */
export default function ProtectedRoute({ children }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
