import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/auth/authSlice";
import pageReducer from "../store/navigation/pageSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    pageTracker: pageReducer,
  },
});
