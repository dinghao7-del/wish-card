import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { Plus, Repeat, Trash2, ArrowLeft } from 'lucide-react';

function Habits() {
  const { members, habits, addHabit, completeHabit, resetHabit, removeHabit } = useFamily();
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [starAmount, setStarAmount] = useState(1);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [targetCount, setTargetCount] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await addHabit(title.trim(), description.trim() || null, frequency, starAmount, assigneeId || null, targetCount);
      setTitle('');
      setDescription('');
      setFrequency('daily');
      setStarAmount(1);
      setAssigneeId('');
      setTargetCount(1);
      setShowAddForm(false);
    } catch (error) {
      // Error handled by toast
    }
  };

  const getFrequencyText = (freq: string) => {
    switch (freq) {
      case 'daily': return '每天';
      case 'weekly': return '每周';
      case 'custom': return '自定义';
      default: return freq;
    }
  };

  return (
    <div className="min-h-screen bg-forest-bg">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="p-2 text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-forest-dark">习惯</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="ml-auto p-2 bg-forest-primary text-white rounded-lg hover:bg-forest-dark"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 添加习惯表单 */}
        {showAddForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm animate-fade-in">
            <h2 className="text-lg font-medium text-gray-800 mb-4">创建新习惯</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">习惯名称</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：每天阅读 30 分钟"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-primary focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="习惯的详细描述..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-primary focus:border-transparent outline-none resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">频率</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-primary focus:border-transparent outline-none"
                  >
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">目标次数</label>
                  <input
                    type="number"
                    value={targetCount}
                    onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">星星奖励</label>
                  <input
                    type="number"
                    value={starAmount}
                    onChange={(e) => setStarAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-primary focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分配给</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-primary focus:border-transparent outline-none"
                  >
                    <option value="">所有成员</option>
                    {members.filter(m => m.is_active).map(member => (
                      <option key={member.id} value={member.id}>
                        {member.avatar} {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-forest-primary text-white rounded-lg hover:bg-forest-dark"
                >
                  创建习惯
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 习惯列表 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-800 mb-4">
            我的习惯 ({habits.length})
          </h2>
          {habits.length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无习惯</p>
          ) : (
            <div className="space-y-3">
              {habits.map(habit => (
                <div key={habit.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{habit.title}</p>
                      {habit.description && (
                        <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-gray-500">
                          {getFrequencyText(habit.frequency)} · 🌟 {habit.rewardStars}
                        </span>
                        {habit.assignee && (
                          <span className="text-sm text-gray-500">
                            {habit.assignee.avatar} {habit.assignee.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeHabit(habit.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                      title="删除习惯"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 进度条 */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>进度</span>
                      <span>{habit.current_count}/{habit.target_count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-forest-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (habit.current_count / habit.target_count) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 打卡按钮 */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => completeHabit(habit.id)}
                      className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                    >
                      <Repeat className="w-4 h-4 inline mr-1" />
                      打卡
                    </button>
                    {habit.current_count >= habit.target_count && (
                      <button
                        onClick={() => resetHabit(habit.id)}
                        className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm font-medium"
                      >
                        重置并领奖
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Habits;
