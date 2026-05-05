// PublicRoute.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/home-feed" replace />;
  }

  return children;
};
