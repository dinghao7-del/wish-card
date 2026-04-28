import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div style={{padding: '20px'}}><h1>🌲 Forest Family</h1><p>路由测试成功！</p></div>} />
        <Route path="/dashboard" element={<div style={{padding: '20px'}}><h1>Dashboard</h1><p>主面板页面</p></div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
