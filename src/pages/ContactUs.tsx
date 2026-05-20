import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Headset, Users, Mail, Copy, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { showToastGlobal } from '../components/Toast';
import { TopAppBar } from '../components/navigation/TopAppBar';

export function ContactUs() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToastGlobal(t('contact_us.copied', { defaultValue: '已复制到剪贴板 🌿' }), 'success');
  };

  return (
    <div className="px-6 min-h-screen bg-surface animate-in fade-in slide-in-from-right-4 duration-500">
      <TopAppBar title={t('contact_us.title', { defaultValue: '联系我们' })} backTo="/profile" />

      <section className="mt-8 space-y-4">
        {/* Customer Service */}
        <div 
          onClick={() => navigate('/support/feedback')}
          className="bg-surface rounded-[2rem] p-6 shadow-sm border border-outline-variant/30 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center text-primary-text">
              <Headset size={28} />
            </div>
            <div>
              <h3 className="font-black text-lg text-on-surface">{t('contact_us.support', { defaultValue: '人工客服' })}</h3>
              <p className="text-sm font-medium text-on-surface-variant/60">{t('contact_us.support_desc', { defaultValue: '与我们在线对话 (每天 10:00-22:00)' })}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-on-surface-variant/30 group-hover:text-primary-text transition-colors" />
        </div>

        {/* QQ Group */}
        <div 
          onClick={() => copyToClipboard('123456789')}
          className="bg-surface rounded-[2rem] p-6 shadow-sm border border-outline-variant/30 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-tertiary-container flex items-center justify-center text-tertiary">
              <Users size={28} />
            </div>
            <div>
              <h3 className="font-black text-lg text-on-surface">{t('contact_us.qq_group', { defaultValue: 'QQ群' })}</h3>
              <p className="text-sm font-medium text-on-surface-variant/60">{t('contact_us.qq_desc', { defaultValue: '与更多的家长用户一起交流' })}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-on-surface-variant/30 group-hover:text-tertiary transition-colors" />
        </div>

        {/* Email */}
        <div className="bg-surface rounded-[2rem] p-6 shadow-sm border border-outline-variant/30 flex items-center justify-between group transition-all">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant/60">
              <Mail size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-lg text-on-surface">{t('contact_us.email', { defaultValue: '邮箱' })}</h3>
              <p className="text-sm font-medium text-on-surface-variant/60 truncate">support@xingmubiao.com</p>
            </div>
          </div>
          <button 
            onClick={() => copyToClipboard('support@xingmubiao.com')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant/40 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
          >
            <Copy size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
