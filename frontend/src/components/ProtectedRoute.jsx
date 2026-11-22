import { Navigate, useLocation } from "react-router-dom";

/**
 * ProtectedRoute component to guard private routes.
 * Supports authentication check and optional role-based authorization.
 *
 * @param {Array<string>} [allowedRoles] - Optional list of permitted roles (e.g., ['donor', 'user'])
 * @param {React.ReactNode} children - Child components to render if authorized
 */
function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();

  const token =
    localStorage.getItem("lifelink_token") ||
    sessionStorage.getItem("lifelink_token");

  let user = null;
  try {
    const rawUser =
      localStorage.getItem("lifelink_user") ||
      sessionStorage.getItem("lifelink_user");
    if (rawUser) {
      user = JSON.parse(rawUser);
    }
  } catch {
    user = null;
  }

  // Not authenticated: redirect to login
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Role check: if specific roles are required, verify user's role
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      // If role not permitted, redirect back to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
