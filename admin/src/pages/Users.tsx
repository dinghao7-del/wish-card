import { useEffect, useState } from 'react';
import { getUsers, getUserDetail, banUser, unbanUser, type AdminUserView } from '../lib/api';
import { Search, Users, RefreshCw, Ban, CheckCircle, Eye, XCircle, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import type { UserDetail, Member, StarTransaction } from '../lib/types';

function isUserDetail(obj: unknown): obj is UserDetail {
  return obj !== null && typeof obj === 'object' && 'member' in obj;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const pageSize = 20;
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { users: data, total: t } = await getUsers(page, pageSize, search);
      setUsers(data);
      setTotal(t);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleViewDetail = async (memberId: string) => {
    setDetailLoading(true);
    setSelectedUser(null);
    try {
      const detail = await getUserDetail(memberId);
      setSelectedUser(detail);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '获取用户详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBan = async (memberId: string) => {
    if (!await showConfirm({ message: '确定封禁此用户？' })) return;
    try {
      await banUser(memberId);
      loadUsers();
      showToast('用户已封禁', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleUnban = async (memberId: string) => {
    try {
      await unbanUser(memberId);
      loadUsers();
      showToast('用户已解封', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">用户管理</h2>
        <button
          onClick={loadUsers}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 搜索 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索用户名或ID..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          搜索
        </button>
      </form>

      {/* 统计 */}
      <div className="text-sm text-gray-500">
        共 <span className="font-medium text-gray-900">{total}</span> 个用户
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">用户</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">所属家庭</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">星星</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">注册时间</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">
                          {user.avatar || user.name[0]}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-400">{user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.family_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-amber-600 font-medium">{user.stars}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          正常
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          已封禁
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewDetail(user.id)}
                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user.is_active ? (
                          <button
                            onClick={() => handleBan(user.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                            title="封禁"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnban(user.id)}
                            className="p-1.5 rounded-lg text-green-400 hover:bg-green-50 hover:text-green-600"
                            title="解封"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                第 {page}/{totalPages} 页
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 用户详情弹窗 */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10 text-center">
            <div className="text-gray-400 py-8">加载中...</div>
          </div>
        </div>
      )}
      {isUserDetail(selectedUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedUser(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">用户详情</h3>
              <button onClick={() => setSelectedUser(null)}>
                <XCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">昵称</div>
                  <div className="font-medium">{selectedUser.member.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">头像</div>
                  <div className="text-2xl">{selectedUser.member.avatar || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">星星数</div>
                  <div className="font-medium text-amber-600 flex items-center gap-1">
                    <Star className="w-4 h-4" /> {selectedUser.member.stars}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">状态</div>
                  <div>{selectedUser.member.is_active ? (
                    <span className="text-green-600">正常</span>
                  ) : (
                    <span className="text-red-600">已封禁</span>
                  )}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">用户ID</div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">{selectedUser.member.id}</code>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-2">所属家庭</div>
                {selectedUser.member.family_id ? (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="font-medium">{selectedUser.member.family_id}</div>
                  </div>
                ) : (
                  <div className="text-gray-400">暂无家庭</div>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-2">家庭成员 ({selectedUser.familyMembers.length})</div>
                <div className="space-y-1">
                  {selectedUser.familyMembers.map((m: Member) => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{m.avatar || '?'}</span>
                        <span className="text-sm">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{m.role === 'parent' ? '家长' : '孩子'}</span>
                        <span className="text-xs text-amber-600">{m.stars} ⭐</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-2">任务统计</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold">{selectedUser.taskStats.total}</div>
                    <div className="text-xs text-gray-500">总任务</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-600">{selectedUser.taskStats.completed}</div>
                    <div className="text-xs text-gray-500">已完成</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-amber-600">{selectedUser.taskStats.pending}</div>
                    <div className="text-xs text-gray-500">进行中</div>
                  </div>
                </div>
              </div>
              {/* 最近星星流水 */}
              {selectedUser.recentTransactions && selectedUser.recentTransactions.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">最近星星流水</div>
                  <div className="space-y-1">
                    {selectedUser.recentTransactions.map((tx: StarTransaction) => (
                      <div key={tx.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="text-sm text-gray-700">{tx.reason}</div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${tx.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                          </span>
                          <span className="text-xs text-gray-400">{format(new Date(tx.created_at), 'MM/dd')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500">注册时间</div>
                <div className="text-sm">{format(new Date(selectedUser.member.created_at), 'yyyy-MM-dd HH:mm:ss')}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
