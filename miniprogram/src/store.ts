import { configureStore as createStore } from '@reduxjs/toolkit';

// 简单的 reducer
const rootReducer = {
  user: (state = {}, action: any) => {
    switch (action.type) {
      case 'user/setUserInfo':
        return { ...state, userInfo: action.payload };
      default:
        return state;
    }
  },
};

export const configureStore = () => {
  return createStore({
    reducer: rootReducer,
  });
};
