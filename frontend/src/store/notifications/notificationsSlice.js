import { createSlice } from "@reduxjs/toolkit";
import {
  fetchNotifications,
  markNotificationsRead,
} from "./notificationsThunks";

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    loading: false,
    items: [],
    unreadCount: 0,
    errorMessage: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.errorMessage = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.data?.items || [];
        state.unreadCount = action.payload?.data?.unreadCount || 0;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.errorMessage = action.payload?.message || "Could not load notifications";
      })
      .addCase(markNotificationsRead.fulfilled, (state) => {
        state.unreadCount = 0;
        state.items = state.items.map((item) => ({
          ...item,
          read: true,
        }));
      });
  },
});

export default notificationsSlice.reducer;
