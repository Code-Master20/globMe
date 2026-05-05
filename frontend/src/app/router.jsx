import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
} from "react-router-dom";
import { Root } from "./Root.jsx";
import { EditPassword } from "../pages/auth/EditPassword.jsx";
import { LogIn } from "../pages/auth/LogIn.jsx";
import { OtpVerification } from "../pages/auth/OtpVerification.jsx";
import { SignUp } from "../pages/auth/SignUp.jsx";
import { PrivateRoute } from "../routes/auth/PrivateRoute.jsx";
import { PublicRoute } from "../routes/auth/PublicRoute.jsx";
import { Dashboard } from "../pages/dashboard/Dashboard.jsx";
import { HomeFeed } from "../pages/feeds/home/HomeFeed.jsx";
import { PhotoFeed } from "../pages/feeds/photo/PhotoFeed.jsx";
import { PostFeed } from "../pages/feeds/post/PostFeed.jsx";
import { VideoFeed } from "../pages/feeds/video/VideoFeed.jsx";
import { NotificationCenter } from "../pages/network/notifications/NotificationCenter.jsx";
import { PeopleHub } from "../pages/network/people/PeopleHub.jsx";
import { Profile } from "../pages/profile/Profile.jsx";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Root />}>
      <Route index element={<Navigate to="/login" replace />} />
      <Route
        path="login"
        element={
          <PublicRoute>
            <LogIn />
          </PublicRoute>
        }
      />
      <Route
        path="signup"
        element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        }
      />
      <Route
        path="reset-password"
        element={
          <PublicRoute>
            <EditPassword />
          </PublicRoute>
        }
      />
      <Route
        path="verify-otp"
        element={
          <PublicRoute>
            <OtpVerification />
          </PublicRoute>
        }
      />
      <Route
        path="dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="home-feed"
        element={
          <PrivateRoute>
            <HomeFeed />
          </PrivateRoute>
        }
      />
      <Route
        path="video-feed"
        element={
          <PrivateRoute>
            <VideoFeed />
          </PrivateRoute>
        }
      />
      <Route
        path="photo-feed"
        element={
          <PrivateRoute>
            <PhotoFeed />
          </PrivateRoute>
        }
      />
      <Route
        path="post-feed"
        element={
          <PrivateRoute>
            <PostFeed />
          </PrivateRoute>
        }
      />
      <Route
        path="people"
        element={
          <PrivateRoute>
            <PeopleHub />
          </PrivateRoute>
        }
      />
      <Route
        path="notifications"
        element={
          <PrivateRoute>
            <NotificationCenter />
          </PrivateRoute>
        }
      />
      <Route
        path="profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="profile/:userId"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
    </Route>,
  ),
);
