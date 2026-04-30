import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Headset, Users, Mail, Copy, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { showToastGlobal } from '../components/Toast';

export function ContactUs() {
  const navigate = useNavigate();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToastGlobal('已复制到剪贴板 🌿', 'success');
  };

  return (
    <div className="px-6 min-h-screen bg-surface animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex justify-between items-center py-6 sticky top-0 bg-surface/80 backdrop-blur-xl z-40 -mx-6 px-6">
        <button 
          onClick={() => navigate(-1)} 
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-[#E8E7E0]/30 shadow-sm text-on-surface-variant hover:bg-surface-container transition-all active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-black text-xl tracking-tight text-on-surface">联系我们</h1>
        <div className="w-12" />
      </header>

      <section className="mt-8 space-y-4">
        {/* Customer Service */}
        <div 
          onClick={() => navigate('/feedback')}
          className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-[#E8E7E0]/30 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center text-primary-text">
              <Headset size={28} />
            </div>
            <div>
              <h3 className="font-black text-lg text-on-surface">人工客服</h3>
              <p className="text-sm font-medium text-on-surface-variant/60">与我们在线对话 (每天 10:00-22:00)</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-on-surface-variant/30 group-hover:text-primary-text transition-colors" />
        </div>

        {/* QQ Group */}
        <div 
          onClick={() => copyToClipboard('123456789')}
          className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-[#E8E7E0]/30 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-tertiary-container flex items-center justify-center text-tertiary">
              <Users size={28} />
            </div>
            <div>
              <h3 className="font-black text-lg text-on-surface">QQ群</h3>
              <p className="text-sm font-medium text-on-surface-variant/60">与更多的家长用户一起交流</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-on-surface-variant/30 group-hover:text-tertiary transition-colors" />
        </div>

        {/* Email */}
        <div className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-[#E8E7E0]/30 flex items-center justify-between group transition-all">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant/60">
              <Mail size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-lg text-on-surface">邮箱</h3>
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
