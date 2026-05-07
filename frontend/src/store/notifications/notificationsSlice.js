import { createSlice } from "@reduxjs/toolkit";
import {
  deleteNotification,
  fetchNotifications,
  markNotificationsRead,
} from "./notificationsThunks";

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    loading: false,
    items: [],
    unreadCount: 0,
    deletingId: null,
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
      })
      .addCase(deleteNotification.pending, (state, action) => {
        state.deletingId = action.meta.arg || null;
        state.errorMessage = null;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notificationId = action.payload?.data?.notificationId;
        const unreadCountDelta = action.payload?.data?.unreadCountDelta || 0;

        state.deletingId = null;
        state.items = state.items.filter((item) => item._id !== `${notificationId}`);
        state.unreadCount = Math.max(0, state.unreadCount + unreadCountDelta);
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.deletingId = null;
        state.errorMessage = action.payload?.message || "Could not remove notification";
      });
  },
});

export default notificationsSlice.reducer;
