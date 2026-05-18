import "./Root.css";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HeaderOne } from "../components/layout/Header/HeaderOne";
import { HeaderTwo } from "../components/layout/Header/HeaderTwo";
import { Outlet, useLocation } from "react-router-dom";
import { checkMe } from "../store/auth/authThunks";
import { fetchNotifications } from "../store/notifications/notificationsThunks";
import { PublicSiteHeader } from "../components/layout/Header/PublicSiteHeader";

const HEADER_SCROLL_MIN_DELTA_PX = 8;
const HEADER_SCROLL_REVERSAL_THRESHOLD_PX = 32;
const HEADER_SCROLL_STOP_DELAY_MS = 500;

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

  if (/^\/games\/[^/]+$/.test(pathname)) {
    return true;
  }

  return /^\/profile\/[^/]+$/.test(pathname);
};

export const Root = () => {
  const dispatch = useDispatch();
  const { checkingAuth, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();
  const headerStackRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const settledScrollDirectionRef = useRef("none");
  const pendingScrollDirectionRef = useRef("none");
  const pendingScrollDistanceRef = useRef(0);
  const isHeaderScrollSessionActiveRef = useRef(false);
  const headerScrollStopTimerRef = useRef(null);
  const hidePrimaryHeaderRef = useRef(false);
  const [hidePrimaryHeader, setHidePrimaryHeader] = useState(false);

  useEffect(() => {
    dispatch(checkMe());
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      setHidePrimaryHeader(false);
      hidePrimaryHeaderRef.current = false;
      lastScrollYRef.current = 0;
      settledScrollDirectionRef.current = "none";
      pendingScrollDirectionRef.current = "none";
      pendingScrollDistanceRef.current = 0;
      isHeaderScrollSessionActiveRef.current = false;
      if (headerScrollStopTimerRef.current) {
        window.clearTimeout(headerScrollStopTimerRef.current);
        headerScrollStopTimerRef.current = null;
      }
      return undefined;
    }

    const handleScroll = () => {
      const currentScrollY = Math.max(0, window.scrollY || 0);
      const previousScrollY = lastScrollYRef.current;
      const deltaY = currentScrollY - previousScrollY;
      const absoluteDeltaY = Math.abs(deltaY);

      if (currentScrollY <= 24) {
        hidePrimaryHeaderRef.current = false;
        lastScrollYRef.current = 0;
        settledScrollDirectionRef.current = "none";
        pendingScrollDirectionRef.current = "none";
        pendingScrollDistanceRef.current = 0;
        isHeaderScrollSessionActiveRef.current = false;
        if (headerScrollStopTimerRef.current) {
          window.clearTimeout(headerScrollStopTimerRef.current);
          headerScrollStopTimerRef.current = null;
        }
        setHidePrimaryHeader(false);
        return;
      }

      if (absoluteDeltaY < HEADER_SCROLL_MIN_DELTA_PX) {
        lastScrollYRef.current = currentScrollY;
        return;
      }

      const nextDirection = deltaY > 0 ? "down" : "up";

      if (!isHeaderScrollSessionActiveRef.current) {
        const shouldHide = nextDirection === "down";
        hidePrimaryHeaderRef.current = shouldHide;
        setHidePrimaryHeader(shouldHide);
        settledScrollDirectionRef.current = nextDirection;
        pendingScrollDirectionRef.current = "none";
        pendingScrollDistanceRef.current = 0;
        isHeaderScrollSessionActiveRef.current = true;
      } else if (nextDirection === settledScrollDirectionRef.current) {
        pendingScrollDirectionRef.current = "none";
        pendingScrollDistanceRef.current = 0;
      } else {
        if (pendingScrollDirectionRef.current !== nextDirection) {
          pendingScrollDirectionRef.current = nextDirection;
          pendingScrollDistanceRef.current = absoluteDeltaY;
        } else {
          pendingScrollDistanceRef.current += absoluteDeltaY;
        }

        if (pendingScrollDistanceRef.current >= HEADER_SCROLL_REVERSAL_THRESHOLD_PX) {
          settledScrollDirectionRef.current = nextDirection;
          pendingScrollDirectionRef.current = "none";
          pendingScrollDistanceRef.current = 0;
        }
      }

      if (headerScrollStopTimerRef.current) {
        window.clearTimeout(headerScrollStopTimerRef.current);
      }

      headerScrollStopTimerRef.current = window.setTimeout(() => {
        const shouldHide = settledScrollDirectionRef.current === "down";
        hidePrimaryHeaderRef.current = shouldHide;
        setHidePrimaryHeader(shouldHide);
        pendingScrollDirectionRef.current = "none";
        pendingScrollDistanceRef.current = 0;
        isHeaderScrollSessionActiveRef.current = false;
        headerScrollStopTimerRef.current = null;
      }, HEADER_SCROLL_STOP_DELAY_MS);

      lastScrollYRef.current = currentScrollY;
    };

    hidePrimaryHeaderRef.current = false;
    lastScrollYRef.current = Math.max(0, window.scrollY || 0);
    settledScrollDirectionRef.current = "none";
    pendingScrollDirectionRef.current = "none";
    pendingScrollDistanceRef.current = 0;
    isHeaderScrollSessionActiveRef.current = false;
    if (headerScrollStopTimerRef.current) {
      window.clearTimeout(headerScrollStopTimerRef.current);
      headerScrollStopTimerRef.current = null;
    }
    setHidePrimaryHeader(false);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (headerScrollStopTimerRef.current) {
        window.clearTimeout(headerScrollStopTimerRef.current);
        headerScrollStopTimerRef.current = null;
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      const refreshNotifications = () => {
        dispatch(fetchNotifications());
      };
      const handleVisibilityRefresh = () => {
        if (document.visibilityState === "visible") {
          refreshNotifications();
        }
      };

      refreshNotifications();
      window.addEventListener("focus", refreshNotifications);
      document.addEventListener("visibilitychange", handleVisibilityRefresh);

      const timer = setInterval(() => {
        refreshNotifications();
      }, 15000);

      return () => {
        clearInterval(timer);
        window.removeEventListener("focus", refreshNotifications);
        document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      };
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    const rootStyle = document.documentElement.style;
    const headerElement = headerStackRef.current;

    if (!headerElement) {
      rootStyle.setProperty("--app-header-offset", "0px");
      return undefined;
    }

    const updateHeaderOffset = () => {
      rootStyle.setProperty("--app-header-offset", `${headerElement.offsetHeight}px`);
    };

    updateHeaderOffset();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updateHeaderOffset();
          })
        : null;

    resizeObserver?.observe(headerElement);
    window.addEventListener("resize", updateHeaderOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateHeaderOffset);
    };
  }, [isAuthenticated, location.pathname]);

  return (
    <div className="root-container">
      {isAuthenticated && (
        <div className="app-header-stack" ref={headerStackRef}>
          <div
            className={`primary-header-shell ${
              hidePrimaryHeader ? "primary-header-shell-hidden" : ""
            }`}
          >
            <HeaderOne />
          </div>
          <HeaderTwo />
        </div>
      )}
      {!isAuthenticated &&
      (!checkingAuth || shouldShowGuestHeader(location.pathname)) &&
      shouldShowGuestHeader(location.pathname) ? (
        <div className="app-header-stack" ref={headerStackRef}>
          <PublicSiteHeader />
        </div>
      ) : null}
      <Outlet />
    </div>
  );
};
