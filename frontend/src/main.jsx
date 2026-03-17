import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Root } from "./Root.jsx";
import {
  createBrowserRouter,
  Route,
  RouterProvider,
  createRoutesFromElements,
} from "react-router-dom";
import { Provider, useSelector } from "react-redux";
import { store } from "./store/store.js";
import { HomeFeed } from "./pages/HomeFeed/HomeFeed.jsx";
import { VideoFeed } from "./pages/VideoFeed/VideoFeed.jsx";
import { PhotoFeed } from "./pages/PhotoFeed/PhotoFeed.jsx";
import { PostFeed } from "./pages/PostFeed/PostFeed.jsx";
import { PeopleHub } from "./pages/PeopleHub/PeopleHub.jsx";
import { NotificationCenter } from "./pages/NotificationCenter/NotificationCenter.jsx";
import { Profile } from "./pages/ProfilePage/Profile.jsx";
import { LogIn } from "./pages/ProfilePage/LogIn.jsx";
import { SignUp } from "./pages/ProfilePage/SignUp.jsx";
import { OtpVerification } from "./components/OtpVerification/OtpVerification.jsx";
import { Navigate } from "react-router-dom";
import { PrivateRoute } from "./features/PrivateRoute.jsx";
import { PublicRoute } from "./features/PublicRoute.jsx";
import { Dashboard } from "./pages/Dashboard/Dashboard.jsx";
import { EditPassword } from "./components/Edit/EditPassword.jsx";

//creating routes for different pages
const Router = createBrowserRouter(
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
        path="reset-password-with-otp"
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

      {/* Protected routes */}

      <Route
        path="dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      ></Route>

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
    </Route>,
  ),
);

//using defined routes inside RouterProvider to reflect different pages
// on visit the different url
createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <RouterProvider router={Router}></RouterProvider>
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      pauseOnHover
      draggable
      theme="dark"
    />
  </Provider>,
);
