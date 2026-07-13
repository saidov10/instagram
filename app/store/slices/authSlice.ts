import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api, getStoredToken, setStoredToken } from "../../services/api";

export interface UserState {
  id: string;
  username: string;
  name: string;
  avatar: string;
  about: string;
  gender: number;
}

interface AuthState {
  currentUser: UserState | null;
  token: string | null;
  loading: boolean;
  profileLoading: boolean;
  error: string | null;
  isLoggedIn: boolean;
}

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop";

const initialState: AuthState = {
  currentUser: null,
  token: typeof window !== "undefined" ? getStoredToken() : null,
  loading: false,
  profileLoading: false,
  error: null,
  isLoggedIn: false,
};

// Async Thunks
export const registerUser = createAsyncThunk(
  "auth/register",
  async (data: any, { rejectWithValue }) => {
    try {
      return await api.account.register(data);
    } catch (err: any) {
      return rejectWithValue(err.message || "Registration failed.");
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (data: any, { dispatch, rejectWithValue }) => {
    try {
      const token = await api.account.login(data);
      // Automatically load profile on success
      await dispatch(fetchMyProfile());
      return token;
    } catch (err: any) {
      return rejectWithValue(err.message || "Login failed.");
    }
  }
);

export const fetchMyProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const profile = await api.profile.getMyProfile();
      return {
        id: profile.id || profile.userId || "",
        username: profile.userName || profile.username || "user",
        name: profile.name || profile.fullName || "Instagram User",
        avatar: profile.avatar || profile.imagePath || profile.image || DEFAULT_AVATAR,
        about: profile.about || "",
        gender: profile.gender || 0,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load profile.");
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (data: { about?: string; gender?: number }, { rejectWithValue }) => {
    try {
      const profile = await api.profile.updateUserProfile(data);
      return profile;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to update profile.");
    }
  }
);

export const updateAvatar = createAsyncThunk(
  "auth/updateAvatar",
  async (file: File, { rejectWithValue }) => {
    try {
      return await api.profile.updateUserImageProfile(file);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to upload avatar.");
    }
  }
);

export const deleteAvatar = createAsyncThunk(
  "auth/deleteAvatar",
  async (_, { rejectWithValue }) => {
    try {
      return await api.profile.deleteUserImageProfile();
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete avatar.");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      setStoredToken(null);
      state.currentUser = null;
      state.token = null;
      state.isLoggedIn = false;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
    initializeToken(state) {
      state.token = getStoredToken();
      if (state.token) {
        state.isLoggedIn = true;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload;
        state.isLoggedIn = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isLoggedIn = false;
      })

      // Fetch Profile
      .addCase(fetchMyProfile.pending, (state) => {
        state.profileLoading = true;
      })
      .addCase(fetchMyProfile.fulfilled, (state, action: PayloadAction<UserState>) => {
        state.profileLoading = false;
        state.currentUser = action.payload;
        state.isLoggedIn = true;
      })
      .addCase(fetchMyProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload as string;
        state.currentUser = null;
        state.isLoggedIn = false;
        state.token = null;
        setStoredToken(null);
      })

      // Update Profile Details
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (state.currentUser) {
          state.currentUser.about = action.meta.arg.about ?? state.currentUser.about;
          state.currentUser.gender = action.meta.arg.gender ?? state.currentUser.gender;
        }
      });
  },
});

export const { logout, clearError, initializeToken } = authSlice.actions;
export default authSlice.reducer;
