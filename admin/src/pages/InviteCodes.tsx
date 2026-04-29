import { useEffect, useState } from 'react';
import {
  getInviteCodes,
  createInviteCode,
  batchCreateInviteCodes,
  updateInviteCode,
  deleteInviteCode,
  generateInviteCode,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Database } from '../lib/supabase';
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  RefreshCw,
  Ban,
  CheckCircle,
  XCircle,
  PackagePlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

type InviteCode = Database['public']['Tables']['invite_codes']['Row'];

export default function InviteCodes() {
  const { admin } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  // 创建表单
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('1');
  const [formExpires, setFormExpires] = useState('');

  // 批量创建表单
  const [batchCount, setBatchCount] = useState('10');
  const [batchPrefix, setBatchPrefix] = useState('');
  const [batchDesc, setBatchDesc] = useState('');
  const [batchMaxUses, setBatchMaxUses] = useState('1');
  const [batchExpires, setBatchExpires] = useState('');

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      setLoading(true);
      const data = await getInviteCodes();
      setCodes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await createInviteCode(
        {
          code: formCode || undefined,
          description: formDesc || undefined,
          max_uses: parseInt(formMaxUses) || 1,
          expires_at: formExpires || undefined,
        },
        admin?.id || ''
      );
      setShowCreate(false);
      resetForm();
      loadCodes();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '创建失败', 'error');
    }
  };

  const handleBatchCreate = async () => {
    try {
      const count = parseInt(batchCount) || 10;
      if (count > 100) {
        showToast('单次最多生成100个邀请码', 'error');
        return;
      }
      await batchCreateInviteCodes(
        {
          count,
          prefix: batchPrefix || undefined,
          description: batchDesc || undefined,
          max_uses: parseInt(batchMaxUses) || 1,
          expires_at: batchExpires || undefined,
        },
        admin?.id || ''
      );
      setShowBatch(false);
      resetBatchForm();
      loadCodes();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '批量创建失败', 'error');
    }
  };

  const handleToggle = async (code: InviteCode) => {
    try {
      await updateInviteCode(code.id, { is_active: !code.is_active });
      loadCodes();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await showConfirm({ message: '确定删除此邀请码？' })) return;
    try {
      await deleteInviteCode(id);
      loadCodes();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setFormCode('');
    setFormDesc('');
    setFormMaxUses('1');
    setFormExpires('');
  };

  const resetBatchForm = () => {
    setBatchCount('10');
    setBatchPrefix('');
    setBatchDesc('');
    setBatchMaxUses('1');
    setBatchExpires('');
  };

  const isExpired = (code: InviteCode) =>
    code.expires_at ? new Date(code.expires_at) < new Date() : false;

  const isUsedUp = (code: InviteCode) =>
    code.max_uses !== -1 && code.current_uses >= code.max_uses;

  // 筛选
  const filtered = codes.filter((c) => {
    if (search && !c.code.toLowerCase().includes(search.toLowerCase()) && !(c.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === 'active' && (!c.is_active || isExpired(c) || isUsedUp(c))) return false;
    if (filterStatus === 'inactive' && c.is_active) return false;
    if (filterStatus === 'expired' && !isExpired(c)) return false;
    return true;
  });

  // 统计
  const activeCount = codes.filter((c) => c.is_active && !isExpired(c) && !isUsedUp(c)).length;
  const expiredCount = codes.filter(isExpired).length;
  const usedUpCount = codes.filter(isUsedUp).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">邀请码管理</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            创建邀请码
          </button>
          <button
            onClick={() => { resetBatchForm(); setShowBatch(true); }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1.5 transition-colors"
          >
            <PackagePlus className="w-4 h-4" />
            批量生成
          </button>
          <button
            onClick={loadCodes}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">总邀请码</div>
          <div className="text-2xl font-bold text-gray-900">{codes.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">可用</div>
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">已过期</div>
          <div className="text-2xl font-bold text-amber-600">{expiredCount}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">已用完</div>
          <div className="text-2xl font-bold text-gray-400">{usedUpCount}</div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索邀请码或备注..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive' | 'expired')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">全部状态</option>
          <option value="active">可用</option>
          <option value="inactive">已停用</option>
          <option value="expired">已过期</option>
        </select>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无邀请码</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">邀请码</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">备注</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">使用情况</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">过期时间</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">创建时间</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((code) => (
                  <tr key={code.id} className="border-b border-gray-100 table-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">{code.code}</code>
                        <button
                          onClick={() => handleCopy(code.code, code.id)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          {copiedId === code.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{code.description || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-700">
                        {code.current_uses}/{code.max_uses === -1 ? '∞' : code.max_uses}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isExpired(code) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <XCircle className="w-3 h-3" /> 已过期
                        </span>
                      ) : isUsedUp(code) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          已用完
                        </span>
                      ) : code.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" /> 可用
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <Ban className="w-3 h-3" /> 已停用
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {code.expires_at ? format(new Date(code.expires_at), 'yyyy-MM-dd HH:mm') : '永久'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(code.created_at), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggle(code)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            code.is_active
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={code.is_active ? '停用' : '启用'}
                        >
                          {code.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 创建弹窗 */}
      {showCreate && (
        <Modal title="创建邀请码" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邀请码（留空自动生成）</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="自动生成"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={() => setFormCode(generateInviteCode())}
                  className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  随机
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <input
                type="text"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="用途说明"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最大使用次数（-1为无限）</label>
              <input
                type="number"
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">过期时间（留空永久有效）</label>
              <input
                type="datetime-local"
                value={formExpires}
                onChange={(e) => setFormExpires(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 批量生成弹窗 */}
      {showBatch && (
        <Modal title="批量生成邀请码" onClose={() => setShowBatch(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">生成数量（最多100）</label>
              <input
                type="number"
                min="1"
                max="100"
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">前缀（可选）</label>
              <input
                type="text"
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                placeholder="如 BETA"
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <input
                type="text"
                value={batchDesc}
                onChange={(e) => setBatchDesc(e.target.value)}
                placeholder="用途说明"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">每个码最大使用次数</label>
              <input
                type="number"
                value={batchMaxUses}
                onChange={(e) => setBatchMaxUses(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">过期时间</label>
              <input
                type="datetime-local"
                value={batchExpires}
                onChange={(e) => setBatchExpires(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBatch(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleBatchCreate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                批量生成
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
