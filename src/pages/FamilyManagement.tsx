import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { ArrowLeft, Copy, Plus, Trash2 } from 'lucide-react';

function FamilyManagement() {
  const { currentUser, members, addMember, deleteMember, familyId } = useFamily();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'parent' | 'child'>('child');
  const [avatar, setAvatar] = useState('👶');

  const isParent = currentUser?.role === 'parent';

  const avatars = ['👶', '👦', '👧', '🧒', '👦🏾', '👧🏾', '👩🦰', '👨🦱', '🧑🎤', '👸'];

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await addMember({
        id: `m-${Date.now()}`,
        name: name.trim(),
        role,
        avatar,
        stars: 0,
      });
      setName('');
      setRole('child');
      setAvatar('👶');
      setShowAddForm(false);
    } catch (error) {
      // Error handled by toast
    }
  };

  const copyInviteCode = () => {
    if (familyId) {
      navigator.clipboard.writeText(familyId);
      alert('邀请码已复制到剪贴板！');
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
          <h1 className="text-xl font-bold text-forest-dark">家庭管理</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 家庭信息 */}
        {familyId && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-800 mb-4">家庭信息</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">家庭ID：</span>
                <code className="bg-gray-100 px-3 py-1 rounded font-bold text-forest-primary text-sm">
                  {familyId}
                </code>
                <button
                  onClick={copyInviteCode}
                  className="p-1.5 text-gray-600 hover:text-gray-800"
                  title="复制邀请码"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 成员列表 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-800">
              家庭成员 ({members.length})
            </h2>
            {isParent && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="p-2 bg-forest-primary text-white rounded-lg hover:bg-forest-dark"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* 添加成员表单 */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg animate-fade-in">
              <h3 className="font-medium text-gray-800 mb-3">添加新成员</h3>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名字
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="请输入名字"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-primary focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('parent')}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        role === 'parent'
                          ? 'border-forest-primary bg-forest-bg'
                          : 'border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">👨👩👧👦</div>
                      <div className="font-medium">家长</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('child')}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        role === 'child'
                          ? 'border-forest-primary bg-forest-bg'
                          : 'border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">👶</div>
                      <div className="font-medium">孩子</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    头像
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {avatars.map(a => (
                      <button
                        type="button"
                        key={a}
                        onClick={() => setAvatar(a)}
                        className={`text-2xl p-2 rounded-lg transition-colors ${
                          avatar === a ? 'bg-forest-primary/20' : 'hover:bg-gray-100'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
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
                    添加
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 成员列表 */}
          <div className="space-y-3">
            {members
              .map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-3xl">{member.avatar}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{member.name}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span
                        className={`font-medium ${
                          member.role === 'parent' ? 'text-blue-600' : 'text-green-600'
                        }`}
                      >
                        {member.role === 'parent' ? '家长' : '孩子'}
                      </span>
                      <span>🌟 {member.stars}</span>
                    </div>
                  </div>
                  {isParent && members.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`确定要移除 ${member.name} 吗？`)) {
                          deleteMember(member.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-500"
                      title="移除成员"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* 使用统计（家长可见） */}
        {isParent && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-800 mb-4">使用统计</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">总成员数</span>
                <span className="font-medium">{members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">总星星数</span>
                <span className="font-medium">
                  {members.reduce((sum, m) => sum + m.stars, 0)} 🌟
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default FamilyManagement;
