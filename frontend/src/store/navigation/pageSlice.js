import { createSlice } from "@reduxjs/toolkit";

const pageSlice = createSlice({
  name: "pageTracker",
  initialState: {
    dashboard: false,
    creating: false,
    searching: false,
    texting: false,
    homeFeed: false,
    videoFeed: false,
    photoFeed: false,
    postFeed: false,
    publicFeed: false,
    notificationFeed: false,
    profileFeed: false,
  },
  reducers: {
    isDashboard(state, action) {
      state.dashboard = action.payload;
    },
    isCreating(state, action) {
      state.creating = action.payload;
    },
    isSearching(state, action) {
      state.searching = action.payload;
    },
    isTexting(state, action) {
      state.texting = action.payload;
    },
    isHomeFeed(state, action) {
      state.homeFeed = action.payload;
    },
    isVideoFeed(state, action) {
      state.videoFeed = action.payload;
    },
    isPhotoFeed(state, action) {
      state.photoFeed = action.payload;
    },
    isPostFeed(state, action) {
      state.postFeed = action.payload;
    },
    isPublicFeed(state, action) {
      state.publicFeed = action.payload;
    },
    isNotificationFeed(state, action) {
      state.notificationFeed = action.payload;
    },
    isProfileFeed(state, action) {
      state.profileFeed = action.payload;
    },
  },
});

export const {
  isDashboard,
  isCreating,
  isSearching,
  isTexting,
  isHomeFeed,
  isVideoFeed,
  isPhotoFeed,
  isPostFeed,
  isPublicFeed,
  isNotificationFeed,
  isProfileFeed,
} = pageSlice.actions;

export default pageSlice.reducer;
