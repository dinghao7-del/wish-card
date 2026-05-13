/**
 * Forest Family 小程序 - Redux Store Provider
 *
 * 对齐 Web 端 App.tsx 的 Provider 嵌套体系
 * 小程序用 Redux 替代 React Context，此组件提供统一 Provider 入口
 */

import { Provider } from 'react-redux';
import { store } from '@/store';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
}
