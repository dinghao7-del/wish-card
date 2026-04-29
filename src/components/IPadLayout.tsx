import React from 'react';
import { useDeviceDetection, getDeviceClasses } from '../hooks/useDeviceDetection';
import { BottomNav } from './BottomNav';

interface IPadLayoutProps {
  children: React.ReactNode;
}

export const IPadLayout: React.FC<IPadLayoutProps> = ({ children }) => {
  const deviceInfo = useDeviceDetection();
  const deviceClasses = getDeviceClasses(deviceInfo);

  // iPad 横屏时使用侧边栏布局
  if (deviceInfo.isIPad && deviceInfo.orientation === 'landscape') {
    return (
      <div className={`sidebar-layout ${deviceClasses}`}>
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title">愿望卡</h1>
          </div>
          <nav className="sidebar-nav">
            <BottomNav variant="sidebar" />
          </nav>
        </aside>
        <main className="main-content">
          {children}
        </main>
      </div>
    );
  }

  // iPad 竖屏或 iPhone 使用底部导航
  return (
    <div className={`app-layout ${deviceClasses}`}>
      <main className="app-content">
        {children}
      </main>
      <BottomNav variant="bottom" />
    </div>
  );
};

// 自适应容器组件
export const AdaptiveContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`app-container ${className}`}>
      {children}
    </div>
  );
};

// 卡片网格组件
export const CardGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`card-grid ${className}`}>
      {children}
    </div>
  );
};

// 分屏提示组件
export const SplitViewNotice: React.FC = () => {
  const { isMultiWindow } = useDeviceDetection();
  
  if (!isMultiWindow) return null;
  
  return (
    <div className="split-view-notice">
      <span>分屏模式</span>
    </div>
  );
};
