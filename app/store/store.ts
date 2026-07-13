import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import postsReducer from "./slices/postsSlice";
import chatsReducer from "./slices/chatsSlice";
import storiesReducer from "./slices/storiesSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    posts: postsReducer,
    chats: chatsReducer,
    stories: storiesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
