// PublicRoute.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export const PublicRoute = ({ children }) => {
  const { checkingAuth, isAuthenticated } = useSelector((state) => state.auth);

  if (checkingAuth) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/home-feed" replace />;
  }

  return children;
};
