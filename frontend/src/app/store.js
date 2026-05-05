import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/auth/authSlice";
import pageReducer from "../store/navigation/pageSlice";
import notificationsReducer from "../store/notifications/notificationsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationsReducer,
    pageTracker: pageReducer,
  },
});
