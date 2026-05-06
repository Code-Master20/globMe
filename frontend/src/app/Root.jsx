import "./Root.css";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HeaderOne } from "../components/layout/Header/HeaderOne";
import { HeaderTwo } from "../components/layout/Header/HeaderTwo";
import { Outlet, useLocation } from "react-router-dom";
import { checkMe } from "../store/auth/authThunks";
import { fetchNotifications } from "../store/notifications/notificationsThunks";
import { PublicSiteHeader } from "../components/layout/Header/PublicSiteHeader";

const shouldShowGuestHeader = (pathname) => {
  if (
    pathname === "/" ||
    pathname === "/home-feed" ||
    pathname === "/photo-feed" ||
    pathname === "/video-feed" ||
    pathname === "/post-feed"
  ) {
    return true;
  }

  return /^\/profile\/[^/]+$/.test(pathname);
};

export const Root = () => {
  const dispatch = useDispatch();
  const { checkingAuth, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();

  useEffect(() => {
    dispatch(checkMe());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
      const timer = setInterval(() => {
        dispatch(fetchNotifications());
      }, 30000);

      return () => clearInterval(timer);
    }
  }, [dispatch, isAuthenticated]);

  return (
    <div className="root-container">
      {isAuthenticated && (
        <>
          <HeaderOne />
          <HeaderTwo />
        </>
      )}
      {!isAuthenticated &&
      (!checkingAuth || shouldShowGuestHeader(location.pathname)) &&
      shouldShowGuestHeader(location.pathname) ? (
        <PublicSiteHeader />
      ) : null}
      <Outlet />
    </div>
  );
};
