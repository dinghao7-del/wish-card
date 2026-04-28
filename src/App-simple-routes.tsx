import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const Welcome = () => (
  <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center', fontFamily: 'system-ui' }}>
    <h1 style={{ fontSize: '48px', marginBottom: '10px' }}>🌲 Forest Family</h1>
    <p style={{ color: '#666', marginBottom: '30px' }}>培养好习惯，收获星星奖励！</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <button style={{ padding: '15px', fontSize: '18px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        🏠 创建新家庭
      </button>
      <button style={{ padding: '15px', fontSize: '18px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        🚪 加入家庭
      </button>
    </div>
  </div>
);

const Dashboard = () => (
  <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
    <h1>主面板</h1>
    <p>星星余额: ⭐ 0</p>
    <nav style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
      <a href="/tasks" style={{ padding: '10px', backgroundColor: '#f0f0f0', textDecoration: 'none', borderRadius: '5px' }}>任务</a>
      <a href="/habits" style={{ padding: '10px', backgroundColor: '#f0f0f0', textDecoration: 'none', borderRadius: '5px' }}>习惯</a>
      <a href="/rewards" style={{ padding: '10px', backgroundColor: '#f0f0f0', textDecoration: 'none', borderRadius: '5px' }}>奖励</a>
    </nav>
  </div>
);

const Tasks = () => <div style={{padding: '20px'}}><h1>任务管理</h1><a href="/dashboard">返回</a></div>;
const Habits = () => <div style={{padding: '20px'}}><h1>习惯管理</h1><a href="/dashboard">返回</a></div>;
const Rewards = () => <div style={{padding: '20px'}}><h1>奖励管理</h1><a href="/dashboard">返回</a></div>;

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
