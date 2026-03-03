import api from "../../utils/api";
import { createAsyncThunk } from "@reduxjs/toolkit";
//========================tracking if user is already logged in==========================
export const checkMe = createAsyncThunk("auth/isMe", async (_, thunkAPI) => {
  try {
    const response = await api.get("/auth/me");
    return response.data;
  } catch (error) {
    let brokenResponse = {
      status: null,
      message: "",
      success: null,
    };
    if (error.response.status === 401) {
      const backendBrokenResponse = error.response.data;
      const status = error.response.status;
      const { message, success } = backendBrokenResponse;
      brokenResponse.status = status;
      brokenResponse.message = message;
      brokenResponse.success = success;
    }
    if (error.response.status === 500) {
      const backendBrokenResponse = error.response.data;
      const status = error.response.status;
      const { message, success } = backendBrokenResponse;
      brokenResponse.status = status;
      brokenResponse.message = message;
      brokenResponse.success = success;
    }

    return thunkAPI.rejectWithValue(brokenResponse);
  }
});

//==========================sending otp before sign-up verification=======================
export const signUpOtpReceived = createAsyncThunk(
  "auth/sign-up-otp",
  async (clientCredentials, thunkAPI) => {
    try {
      const response = await api.post("/auth/sign-up", clientCredentials);
      return response.data;
    } catch (error) {
      let brokenResponse = {
        status: null,
        message: "",
        success: null,
      };
      const backendBrokenResponse = error.response?.data;
      const status = error.response.status;

      const { message, success } = backendBrokenResponse;
      brokenResponse.message = message;
      brokenResponse.status = status;
      brokenResponse.success = success;
      return thunkAPI.rejectWithValue(brokenResponse);
    }
  },
);

//========================otp verify for successfull sign-up==============================
export const otpVerifiedAndSignedUp = createAsyncThunk(
  "auth/verify-sign-up-otp",
  async (clientCredentials, thunkAPI) => {
    try {
      const response = await api.post(
        "/auth/sign-up/verify-otp",
        clientCredentials,
      );

      const dataFromBackend = response.data;
      return dataFromBackend;
    } catch (error) {
      let brokenResponse = {
        status: null,
        message: "",
        success: null,
        id: null,
      };
      const backendBrokenResponse = error.response?.data;
      const status = error.response.status;

      const { message, success, id } = backendBrokenResponse;
      brokenResponse.status = status;
      brokenResponse.success = success;
      brokenResponse.message = message;
      brokenResponse.id = id;
      return thunkAPI.rejectWithValue(brokenResponse);
    }
  },
);

//==========================sending otp before log-in verification=======================
export const logInOtpReceived = createAsyncThunk(
  "auth/log-in-otp",
  async (clientCredentials, thunkAPI) => {
    try {
      const response = await api.post("/auth/log-in", clientCredentials);
      return response.data;
    } catch (error) {
      let brokenResponse = {
        status: null,
        message: "",
        success: null,
      };

      const { message, success } = error.response.data;
      const { status } = error.response;

      brokenResponse.message = message;
      brokenResponse.success = success;
      brokenResponse.status = status;

      return thunkAPI.rejectWithValue(brokenResponse);
    }
  },
);

export const otpVerifiedAndLoggedIn = createAsyncThunk(
  "auth/verify-log-in-otp",
  async (clientCredentials, thunkAPI) => {
    try {
      const response = await api.post(
        "/auth/log-in/verify-otp",
        clientCredentials,
      );

      return response.data;
    } catch (error) {
      const brokenResponse = {
        message: "",
        success: null,
        status: null,
      };

      const { message, success } = error.response.data;
      const { status } = error.response;
      brokenResponse.message = message;
      brokenResponse.success = success;
      brokenResponse.status = status;
      return thunkAPI.rejectWithValue(brokenResponse);
    }
  },
);

export const logOut = createAsyncThunk(
  "auth/logout",
  async (clientCredentials, thunkAPI) => {
    try {
    } catch (error) {}
  },
);

export const uploadProfilePic = createAsyncThunk(
  "auth/uploadProfilePic",
  async (file, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("file", file); // must match multer.single("file")

      const response = await api.post("/user/upload-avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue({
        status: error.response?.status,
        message: error.response?.data?.message || "Upload failed",
        success: false,
      });
    }
  },
);

export const uploadBanner = createAsyncThunk(
  "auth/uploadBanner",
  async (file, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/user/upload-banner", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue({
        status: error.response?.status,
        message: error.response?.data?.message || "Upload failed",
        success: false,
      });
    }
  },
);
