import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Copy, Check, RefreshCw,
  Power, PowerOff, Loader2, AlertCircle, Key, Users, Clock, X
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { showToastGlobal } from '../components/Toast';
import { showConfirm } from '../components/ConfirmDialog';
import * as api from '../lib/api';

interface InviteCodeRow {
  id: string;
  code: string;
  description: string | null;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  created_by: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function AdminInviteCodes() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useFamily();

  const [codes, setCodes] = useState<InviteCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // 创建表单
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [newExpires, setNewExpires] = useState('');
  const [creating, setCreating] = useState(false);

  // 复制反馈
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 非管理员拦截
  useEffect(() => {
    if (currentUser && currentUser.role !== 'parent') {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  // 加载邀请码列表
  const loadCodes = async () => {
    setLoading(true);
    try {
      const data = await api.getInviteCodes();
      setCodes(data as InviteCodeRow[]);
    } catch (err: any) {
      console.error('加载邀请码失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCodes(); }, []);

  // 创建邀请码
  const handleCreate = async () => {
    if (!currentUser) return;
    setCreating(true);
    try {
      await api.createInviteCode({
        code: newCode || undefined,
        description: newDesc || undefined,
        max_uses: newMaxUses,
        expires_at: newExpires || undefined,
      }, currentUser.id);
      setShowCreate(false);
      setNewCode('');
      setNewDesc('');
      setNewMaxUses(1);
      setNewExpires('');
      await loadCodes();
    } catch (err: any) {
      showToastGlobal(err.message || '创建失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  // 切换启用/停用
  const handleToggle = async (code: InviteCodeRow) => {
    try {
      await api.updateInviteCode(code.id, { is_active: !code.is_active });
      await loadCodes();
    } catch (err: any) {
      showToastGlobal(err.message, 'error');
    }
  };

  // 删除
  const handleDelete = async (id: string) => {
    if (!await showConfirm({ message: '确定要删除此邀请码吗？' })) return;
    try {
      await api.deleteInviteCode(id);
      await loadCodes();
    } catch (err: any) {
      showToastGlobal(err.message, 'error');
    }
  };

  // 复制邀请码
  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '永不过期';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const isExpired = (code: InviteCodeRow) => {
    if (!code.expires_at) return false;
    return new Date(code.expires_at) < new Date();
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-black text-lg">{t('admin.invite_codes.title', '邀请码管理')}</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#006e1c] text-white shadow-lg active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 py-4">
        <div className="bg-white dark:bg-surface-container-low rounded-2xl p-3 text-center shadow-sm border border-outline-variant/10">
          <div className="text-2xl font-black text-[#006e1c]">{codes.filter(c => c.is_active && !isExpired(c)).length}</div>
          <div className="text-[10px] font-bold text-on-surface-variant">可用</div>
        </div>
        <div className="bg-white dark:bg-surface-container-low rounded-2xl p-3 text-center shadow-sm border border-outline-variant/10">
          <div className="text-2xl font-black text-orange-500">{codes.filter(c => !c.is_active || isExpired(c)).length}</div>
          <div className="text-[10px] font-bold text-on-surface-variant">已停用/过期</div>
        </div>
        <div className="bg-white dark:bg-surface-container-low rounded-2xl p-3 text-center shadow-sm border border-outline-variant/10">
          <div className="text-2xl font-black text-blue-500">{codes.reduce((sum, c) => sum + c.current_uses, 0)}</div>
          <div className="text-[10px] font-bold text-on-surface-variant">总使用</div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#006e1c]" size={32} />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-20 text-on-surface-variant">
            <Key size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold">暂无邀请码</p>
            <p className="text-xs mt-1">点击右上角 + 创建第一个邀请码</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map(code => (
              <motion.div
                key={code.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white dark:bg-surface-container-low rounded-2xl p-4 shadow-sm border transition-all",
                  code.is_active && !isExpired(code)
                    ? "border-outline-variant/10"
                    : "border-red-100 opacity-60"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-wider text-on-surface">{code.code}</span>
                    <button
                      onClick={() => handleCopy(code.code, code.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container hover:bg-primary/10 transition-colors"
                    >
                      {copiedId === code.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-on-surface-variant" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(code)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                        code.is_active
                          ? "text-green-500 hover:bg-green-50"
                          : "text-on-surface-variant hover:bg-surface-container"
                      )}
                    >
                      {code.is_active ? <Power size={16} /> : <PowerOff size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(code.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {code.description && (
                  <p className="text-xs text-on-surface-variant mb-2">{code.description}</p>
                )}

                <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {code.max_uses === -1 ? '无限次' : `${code.current_uses}/${code.max_uses}次`}
                  </span>
                  <span className={cn("flex items-center gap-1", isExpired(code) && "text-red-500")}>
                    <Clock size={12} />
                    {formatDate(code.expires_at)}
                  </span>
                  {!code.is_active && (
                    <span className="text-red-400 font-black">已停用</span>
                  )}
                  {isExpired(code) && (
                    <span className="text-red-400 font-black">已过期</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-surface-container rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 pb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-black">创建邀请码</h3>
                  <button onClick={() => setShowCreate(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-sm text-on-surface-variant">生成内测邀请码，分发给目标用户</p>
              </div>

              <div className="px-8 pb-8 space-y-4">
                {/* 邀请码 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-2">邀请码（留空自动生成）</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCode}
                      onChange={e => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="如：BILESIA2026"
                      maxLength={20}
                      className="flex-1 h-12 bg-[#f5f5f5] rounded-2xl px-5 font-black text-on-surface outline-none border-2 border-transparent focus:border-[#006e1c]/30 transition-all text-sm tracking-wider"
                    />
                    <button
                      onClick={() => setNewCode(api.generateInviteCode())}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#006e1c]/10 text-[#006e1c] active:scale-95 transition-all"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                {/* 描述 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-2">备注说明</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="如：首批内测用户"
                    className="w-full h-12 bg-[#f5f5f5] rounded-2xl px-5 font-bold text-on-surface outline-none border-2 border-transparent focus:border-[#006e1c]/30 transition-all text-sm"
                  />
                </div>

                {/* 使用次数 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-2">最大使用次数（-1 表示无限）</label>
                  <input
                    type="number"
                    value={newMaxUses}
                    onChange={e => setNewMaxUses(parseInt(e.target.value) || 1)}
                    min={-1}
                    className="w-full h-12 bg-[#f5f5f5] rounded-2xl px-5 font-bold text-on-surface outline-none border-2 border-transparent focus:border-[#006e1c]/30 transition-all text-sm"
                  />
                </div>

                {/* 过期时间 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-2">过期时间（留空永不过期）</label>
                  <input
                    type="datetime-local"
                    value={newExpires}
                    onChange={e => setNewExpires(e.target.value)}
                    className="w-full h-12 bg-[#f5f5f5] rounded-2xl px-5 font-bold text-on-surface outline-none border-2 border-transparent focus:border-[#006e1c]/30 transition-all text-sm"
                  />
                </div>

                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full h-14 bg-[#006e1c] text-white rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {creating ? <Loader2 className="animate-spin mx-auto" size={20} /> : '创建邀请码'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
