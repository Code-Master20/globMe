// PublicRoute.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { consumePostAuthRedirect } from "../../utils/authRedirect";

export const PublicRoute = ({ children }) => {
  const { checkingAuth, isAuthenticated } = useSelector((state) => state.auth);

  if (checkingAuth) {
    return children;
  }

  if (isAuthenticated) {
    const rememberedPath = consumePostAuthRedirect();
    return <Navigate to={rememberedPath || "/home-feed"} replace />;
  }

  return children;
};
