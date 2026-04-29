import { useState } from 'react';
import { createApp } from '@tarojs/taro';
import { Provider } from 'react-redux';
import { configureStore } from './store';
import TabLayout from './components/TabLayout';
import './app.scss';

// 创建Redux store
const store = configureStore();

function App() {
  const [launchOptions, setLaunchOptions] = useState(null);

  // 小程序启动时
  useLaunch(() => {
    const options = Taro.getLaunchOptionsSync();
    setLaunchOptions(options);
    
    // 获取用户信息
    Taro.getUserInfo({
      success: (res) => {
        store.dispatch({
          type: 'user/setUserInfo',
          payload: res.userInfo,
        });
      },
    });
  });

  // 小程序显示时
  useShow(() => {
    // 页面显示时的逻辑
  });

  // 小程序隐藏时
  useHide(() => {
    // 页面隐藏时的逻辑
  });

  return (
    <Provider store={store}>
      <TabLayout />
    </Provider>
  );
}

export default createApp(App);
