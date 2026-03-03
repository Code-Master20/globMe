import { createSlice } from "@reduxjs/toolkit";
import {
  checkMe,
  signUpOtpReceived,
  otpVerifiedAndSignedUp,
  logInOtpReceived,
  otpVerifiedAndLoggedIn,
  uploadProfilePic,
  uploadBanner,
} from "./authThunks";

//=============================== setting constants to localstorage for values' persistent =====================
const otpSent = JSON.parse(localStorage.getItem("otp-sent"));
const purpose = JSON.parse(localStorage.getItem("purpose"));

const authSlice = createSlice({
  name: "auth",
  initialState: {
    checkingAuth: false,
    formLoading: false,
    isAuthenticated: false,
    status: null,
    success: false,
    user: null,
    isLogInClicked: false,
    errorMessage: null,
    successMessage: null,
    purpose: purpose ? purpose : null,
    id: null,
    otp: {
      sent: otpSent ? otpSent : false, //false means otp is sending in pending situation,
      // if true means otp is sent successfully
      verifying: false,
      verified: false,
    },
  },

  reducers: {
    isLogInClickedFun(state, action) {
      state.isLogInClicked = action.payload;
    },
    resetOtpLockState(state) {
      state.id = null;
    },
  },
  //========================= hitting "/isMe" to see if user is already logged in =======================
  extraReducers: (builder) => {
    builder
      .addCase(checkMe.pending, (state) => {
        state.checkingAuth = true; // NEW
        state.isAuthenticated = false;
      })
      .addCase(checkMe.fulfilled, (state, action) => {
        state.checkingAuth = false; // NEW
        state.status = action.payload.status;
        state.isAuthenticated = true;
        state.user = action.payload.data;
        state.successMessage = action.payload.message;
      })
      .addCase(checkMe.rejected, (state, action) => {
        state.checkingAuth = false; // NEW
        state.status = action.payload.status || 401;
        state.isAuthenticated = false;
        state.user = null;
      })

      // ===================== SIGN UP OTP =====================
      .addCase(signUpOtpReceived.pending, (state) => {
        state.formLoading = true; // ✅ FIXED
        state.errorMessage = null;
        state.successMessage = null;
        state.otp.sent = false;
      })
      .addCase(signUpOtpReceived.fulfilled, (state, action) => {
        state.formLoading = false; // ✅ FIXED
        state.otp.sent = true;
        state.success = true;
        state.status = action.payload.status;
        state.user = action.payload.data;
        state.successMessage = action.payload.message;
        state.purpose = "signup";
        localStorage.setItem("user", JSON.stringify(action.payload.data));
        localStorage.setItem("purpose", JSON.stringify("signup"));
      })
      .addCase(signUpOtpReceived.rejected, (state, action) => {
        state.formLoading = false; // ✅ FIXED
        state.otp.sent = false;
        state.success = false;
        state.successMessage = null;
        state.errorMessage = action.payload.message;
        state.status = action.payload.status;
      })

      // =====================VERIFY SIGN UP OTP AND AUTO SIGNED UP=====================
      .addCase(otpVerifiedAndSignedUp.pending, (state, action) => {
        state.formLoading = true; // ✅ FIXED
        state.otp.verifying = true;
      })
      .addCase(otpVerifiedAndSignedUp.fulfilled, (state, action) => {
        state.formLoading = false; // ✅ FIXED
        state.otp.verifying = false;
        state.otp.verified = action.payload.success; //means otp successfully verified
        state.successMessage = action.payload.message;
        state.user = action.payload.data;
        state.isAuthenticated = action.payload.success;
        localStorage.removeItem("user");
        localStorage.removeItem("purpose");
      })
      .addCase(otpVerifiedAndSignedUp.rejected, (state, action) => {
        state.formLoading = false; // ✅ FIXED
        state.otp.verifying = false;
        state.otp.verified = action.payload.success;
        state.successMessage = null;
        state.errorMessage = action.payload.message;
        state.id = action.payload.id;
      })
      // ============================== LOG-IN OTP =================================
      .addCase(logInOtpReceived.pending, (state, action) => {
        state.formLoading = true;
        state.otp.sent = false; //means otp is pending to be sent
      })
      .addCase(logInOtpReceived.fulfilled, (state, action) => {
        state.formLoading = false;
        state.otp.sent = action.payload.success; //success = true from backend
        state.success = action.payload.success;
        state.status = action.payload.status;
        state.user = action.payload.data;
        state.successMessage = action.payload.message;
        localStorage.setItem(
          "otp-sent",
          JSON.stringify(action.payload.success),
        );
        localStorage.setItem(
          "user",
          JSON.stringify({ email: action.payload.data.email }),
        );
        localStorage.setItem("purpose", JSON.stringify("login"));
      })
      .addCase(logInOtpReceived.rejected, (state, action) => {
        state.formLoading = false;
        state.otp.sent = action.payload.success; //success = false; from backend
        state.successMessage = null;
        state.errorMessage = action.payload.message; //message = "failed to send verification code" from backend
        state.status = action.payload.status;
        state.success = action.payload.success;
      })
      // =====================VERIFY LOG IN OTP AND AUTO LOG IN =====================
      .addCase(otpVerifiedAndLoggedIn.pending, (state, action) => {
        state.formLoading = true;
        state.otp.verifying = true; //means otp is verified
      })
      .addCase(otpVerifiedAndLoggedIn.fulfilled, (state, action) => {
        state.formLoading = false;
        state.otp.verifying = false;
        state.otp.verified = action.payload.success; //means otp is successfully verified
        state.successMessage = action.payload.message;
        state.user = action.payload.data;
        state.isAuthenticated = action.payload.success;
        localStorage.removeItem("otp-sent");
        localStorage.removeItem("purpose");
        localStorage.removeItem("user");
        localStorage.setItem(
          "isAuthenticated",
          JSON.stringify(action.payload.success),
        );
      })
      .addCase(otpVerifiedAndLoggedIn.rejected, (state, action) => {
        state.formLoading = false;
        state.otp.verifying = false; //means otp is not verifying
        state.otp.verified = action.payload.success; //here success=false means otp cannot be verified
        state.successMessage = null;
        state.errorMessage = action.payload.message;
      })

      // ====================== UPLOAD PROFILE PIC ======================
      .addCase(uploadProfilePic.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadProfilePic.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data;
        state.successMessage = action.payload.message;
      })
      .addCase(uploadProfilePic.rejected, (state, action) => {
        state.loading = false;
        state.errorMessage = action.payload?.message;
      })

      // ====================== UPLOAD BANNER ======================
      .addCase(uploadBanner.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadBanner.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data;
        state.successMessage = action.payload.message;
      })
      .addCase(uploadBanner.rejected, (state, action) => {
        state.loading = false;
        state.errorMessage = action.payload?.message;
      });
  },
});

export const { isLogInClickedFun, resetOtpLockState } = authSlice.actions;

export default authSlice.reducer;
