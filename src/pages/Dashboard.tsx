import { Link } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { CheckSquare, Repeat, Gift, Users, LogOut, Star } from 'lucide-react';

function Dashboard() {
  const { currentUser, setCurrentUser, members, tasks, rewards, logout } = useFamily();

  if (!currentUser) {
    return null;
  }

  const userTasks = tasks.filter(t => t.assigneeIds.includes(currentUser.id) && t.status !== 'completed');
  const userHabits = tasks.filter(t => t.isHabit && t.assigneeIds.includes(currentUser.id));
  const availableRewards = rewards.filter(r => r.category !== 'redeemed');

  const totalStars = currentUser.stars;
  
  // 计算今日完成的任务数
  const today = new Date().toISOString().split('T')[0];
  const todayCompletedTasks = tasks.filter(t => 
    t.status === 'completed' && t.startTime && t.startTime.startsWith(today)
  ).length;

  return (
    <div className="min-h-screen bg-background/50">
      {/* 顶部导航 */}
      <header className="bg-background/80 backdrop-blur-xl shadow-sm sticky top-0 z-40 -mx-4 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-surface shadow-sm">
            {currentUser.avatar && <span className="text-2xl flex items-center justify-center h-full">{currentUser.avatar}</span>}
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface">我的家庭</h1>
            <p className="text-sm text-on-surface-variant">
              {currentUser.name} · {currentUser.role === 'parent' ? '家长' : '孩子'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div 
            onClick={() => {}}
            className="bg-surface-container-low backdrop-blur-sm py-1.5 px-4 rounded-full flex items-center gap-2 shadow-sm border border-outline-variant/10 cursor-pointer hover:bg-surface-container transition-colors active:scale-95"
          >
            <Star size={18} className="text-star fill-current" />
            <span className="font-black text-on-surface">{totalStars.toLocaleString()}</span>
          </div>
          <button
            onClick={logout}
            className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container transition-colors"
            title="退出登录"
          >
            <LogOut size={22} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* 今日成长能量卡片 */}
        <div className="relative bg-gradient-to-b from-[#81D67A] via-[#66BB6A] to-[#4CAF50] rounded-[2rem] py-6 px-8 text-white shadow-lg overflow-hidden">
          {/* 装饰星星 - 右上角 */}
          <div className="absolute top-3 right-3 opacity-30">
            <svg width="50" height="50" viewBox="0 0 24 24" fill="currentColor" className="text-white">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          {/* 装饰星星 - 左上角 */}
          <div className="absolute top-8 left-2 opacity-20">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" className="text-white">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-300">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="text-[11px] font-bold text-white/90">今日能量</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="text-6xl font-bold leading-none">{todayCompletedTasks}</div>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-300">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            
            <div className="w-full max-w-[200px] h-1.5 bg-white/30 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-yellow-300 rounded-full w-1/4" />
            </div>
            
            <p className="text-white/90 text-[11px]">
              继续加油，你真棒！
            </p>
          </div>
        </div>

        {/* 功能快捷入口 */}
        <div className="grid grid-cols-4 gap-3">
          <QuickActionButton 
            icon="✓"
            label="创建目标" 
            color="bg-[#E3F2FD] text-[#1976D2]" 
            onClick={() => {}}
          />
          <QuickActionButton 
            icon="🎁"
            label="许下心愿" 
            color="bg-[#FFF3E0] text-[#E65100]" 
            onClick={() => {}}
          />
          <QuickActionButton 
            icon="🔄"
            label="查看日历" 
            color="bg-[#F3E5F5] text-[#7B1FA2]" 
            onClick={() => {}}
          />
          <QuickActionButton 
            icon="🍅"
            label="番茄时钟" 
            color="bg-[#FFEBEE] text-[#C62828]" 
            onClick={() => {}}
            disabled
          />
        </div>

        {/* 数据统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            icon={CheckSquare} 
            label="进行中任务" 
            value={userTasks.length}
            color="text-blue-500"
          />
          <StatCard 
            icon={Repeat} 
            label="我的习惯" 
            value={userHabits.length}
            color="text-green-500"
          />
          <StatCard 
            icon={Gift} 
            label="可兑换奖励" 
            value={availableRewards.length}
            color="text-purple-500"
          />
          <StatCard 
            icon={Users} 
            label="家庭成员" 
            value={members.length}
            color="text-orange-500"
          />
        </div>

        {/* 今日任务 */}
        <div className="bg-surface-container-low/50 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-xl flex items-center gap-2 text-on-surface">
              今日任务
              <span className="bg-[#FFF9C4] text-[#FBC02D] text-[10px] px-2 py-0.5 rounded-full font-black">
                {userTasks.length}
              </span>
            </h3>
            <Link to="/tasks" className="text-primary text-sm font-black">查看全部 →</Link>
          </div>
          
          {userTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-on-surface-variant text-lg mb-2">🎉 今天没有任务</p>
              <p className="text-sm text-on-surface-variant">去创建一些有趣的任务吧！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userTasks.slice(0, 5).map((task, idx) => (
                <div key={task.id} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors">
                  <span className="text-2xl">📝</span>
                  <div className="flex-1">
                    <p className="font-medium text-on-surface">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-on-surface-variant">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-[#FFF9C4] px-3 py-1 rounded-full">
                    <Star size={14} className="text-[#FBC02D] fill-current" />
                    <span className="font-bold text-[#FBC02D]">{task.rewardStars}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 家庭排行榜 */}
        <div className="bg-white rounded-2xl p-6 pb-8 relative overflow-hidden shadow-sm">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-gray-800">
            家庭排行榜
            <span className="text-yellow-500">★</span>
          </h3>
          
          <div className="flex justify-center items-end gap-4 h-44 relative">
            {[...members]
              .sort((a, b) => b.stars - a.stars)
              .slice(0, 3)
              .map((member, idx) => {
                // 重新排列显示顺序：第2名、第1名、第3名
                if (idx === 0) return { member, originalRank: 1, displayIndex: 1 };
                if (idx === 1) return { member, originalRank: 2, displayIndex: 0 };
                return { member, originalRank: 3, displayIndex: 2 };
              })
              .sort((a, b) => a.displayIndex - b.displayIndex)
              .map(({ member, originalRank }) => (
                <PodiumItem 
                  key={member.id}
                  member={member}
                  rank={originalRank}
                />
              ))
            }
          </div>
        </div>

        {/* 切换用户（多孩家庭） */}
        {members.length > 1 && (
          <div className="bg-surface-container-low/50 rounded-[2rem] p-6 shadow-sm">
            <h2 className="font-black text-lg mb-4 text-on-surface">切换身份</h2>
            <div className="flex flex-wrap gap-3">
              {members.map(member => (
                <button
                  key={member.id}
                  onClick={() => setCurrentUser(member)}
                  className={`px-5 py-3 rounded-xl transition-all ${
                    currentUser.id === member.id
                      ? 'bg-primary text-white shadow-md scale-105'
                      : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
                  }`}
                >
                  <span className="text-2xl mr-2">{member.avatar}</span>
                  {member.name}
                  {member.stars > 0 && (
                    <span className="ml-2 text-sm">🌟 {member.stars}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// 快捷操作按钮组件
function QuickActionButton({ icon, label, color, onClick, disabled }: { 
  icon: string, 
  label: string, 
  color: string, 
  onClick?: () => void,
  disabled?: boolean 
}) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 ${
        disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : 'bg-white'
      }`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${!disabled ? color : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap">{label}</span>
    </button>
  );
}

// 统计卡片组件
function StatCard({ icon: Icon, label, value, color }: { 
  icon: any, 
  label: string, 
  value: number,
  color: string
}) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <Icon size={20} className={color} />
        <span className="text-sm text-on-surface-variant">{label}</span>
      </div>
      <p className="text-3xl font-bold text-on-surface">{value}</p>
    </div>
  );
}

// 领奖台项目组件
function PodiumItem({ member, rank }: { member: any; rank: number }) {
  const isFirst = rank === 1;
  const height = isFirst ? "h-24" : rank === 2 ? "h-16" : "h-12";
  
  return (
    <div className="flex flex-col items-center gap-2 relative w-20">
      {/* 排名徽章 */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-md absolute -top-4 z-20 border-2 border-surface ${
        isFirst ? 'bg-[#FBC02D] text-white' : 'bg-[#BDBDBD] text-white'
      }`}>
        {rank}
      </div>
      
      {/* 头像 */}
      <div 
        className={`w-16 h-16 rounded-full overflow-hidden border-4 shadow-lg z-10 ${
          isFirst ? 'border-[#FBC02D]' : 'border-surface'
        }`}
      >
        <span className="text-4xl flex items-center justify-center h-full">{member.avatar}</span>
      </div>
      
      {/* 领奖台 */}
      <div className={`w-full rounded-t-2xl flex flex-col items-center justify-center transition-all duration-1000 shadow-sm relative ${
        height
      } ${
        isFirst ? 'bg-primary' : 'bg-surface-container-high'
      }`}>
        <span className={`text-[10px] font-bold mb-1 ${
          isFirst ? 'text-white/60' : 'text-black/30 dark:text-white/30'
        }`}>
          {member.name}
        </span>
        <span className={`text-lg font-black leading-none ${
          isFirst ? 'text-white' : 'text-on-surface'
        }`}>
          {member.stars.toLocaleString()}
        </span>
        
        {isFirst && (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-t-2xl pointer-events-none" />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
