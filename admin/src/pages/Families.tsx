import { useEffect, useState } from 'react';
import { getFamilies, getFamilyDetail, type FamilyWithMembers } from '../lib/api';
import { Search, RefreshCw, Home, Users, ChevronLeft, ChevronRight, Eye, XCircle, Star, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../components/Toast';
import type { FamilyDetail, Member } from '../lib/types';

function isFamilyDetail(obj: unknown): obj is FamilyDetail {
  return obj !== null && typeof obj === 'object' && 'family' in obj;
}

export default function Families() {
  const [families, setFamilies] = useState<FamilyWithMembers[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<FamilyDetail | null>(null);
  const pageSize = 20;
  const { showToast } = useToast();

  useEffect(() => {
    loadFamilies();
  }, [page]);

  const loadFamilies = async () => {
    try {
      setLoading(true);
      const { families: data, total: t } = await getFamilies(page, pageSize, search);
      setFamilies(data);
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
    loadFamilies();
  };

  const handleViewDetail = async (familyId: string) => {
    setDetailLoading(true);
    setSelectedFamily(null);
    try {
      const detail = await getFamilyDetail(familyId);
      setSelectedFamily(detail);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '获取家庭详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">家庭管理</h2>
        <button
          onClick={loadFamilies}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索家庭名或ID..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          搜索
        </button>
      </form>

      <div className="text-sm text-gray-500">
        共 <span className="font-medium text-gray-900">{total}</span> 个家庭
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">家庭名</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">邀请码</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">成员数</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">创建时间</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {families.map((family) => (
                  <tr key={family.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{family.name}</div>
                          <div className="text-xs text-gray-400">{family.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {family.invite_code ? (
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{family.invite_code}</code>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>{family.member_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(family.created_at), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetail(family.id)}
                        className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">第 {page}/{totalPages} 页</span>
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

      {/* 家庭详情弹窗 */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10 text-center">
            <div className="text-gray-400 py-8">加载中...</div>
          </div>
        </div>
      )}
      {isFamilyDetail(selectedFamily) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedFamily(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">家庭详情</h3>
              <button onClick={() => setSelectedFamily(null)}>
                <XCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">家庭名</div>
                  <div className="font-medium">{selectedFamily.family.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">邀请码</div>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{selectedFamily.family.invite_code || '-'}</code>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">家庭ID</div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">{selectedFamily.family.id}</code>
              </div>

              {/* 任务统计 */}
              <div>
                <div className="text-sm text-gray-500 mb-2">任务统计</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold">{selectedFamily.taskCount}</div>
                    <div className="text-xs text-gray-500">总任务</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-600">{selectedFamily.completedTaskCount}</div>
                    <div className="text-xs text-gray-500">已完成</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-amber-600">{selectedFamily.taskCount - selectedFamily.completedTaskCount}</div>
                    <div className="text-xs text-gray-500">进行中</div>
                  </div>
                </div>
              </div>

              {/* 成员列表 */}
              <div>
                <div className="text-sm text-gray-500 mb-2">家庭成员 ({selectedFamily.members.length})</div>
                <div className="space-y-1">
                  {selectedFamily.members.map((m: Member) => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{m.avatar || '?'}</span>
                        <div>
                          <div className="text-sm font-medium">{m.name}</div>
                          <div className="text-xs text-gray-400">{m.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          m.role === 'parent' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`}>
                          {m.role === 'parent' ? '家长' : '孩子'}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <Star className="w-3 h-3" /> {m.stars}
                        </span>
                        <span className={`text-xs ${m.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {m.is_active ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">创建时间</div>
                <div className="text-sm">{format(new Date(selectedFamily.family.created_at), 'yyyy-MM-dd HH:mm:ss')}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
