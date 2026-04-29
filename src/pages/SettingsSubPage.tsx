import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Shield, Bell, Settings, ChevronRight, Smartphone, Mail, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { useFamily } from '../context/FamilyContext';
import { showToastGlobal } from '../components/Toast';
import { showConfirm } from '../components/ConfirmDialog';

export function SettingsSubPage() {
  const navigate = useNavigate();
  const { type } = useParams();
  const { t, i18n } = useTranslation();
  const { currentUser, updateMember, logout } = useFamily();
  const [activeItem, setActiveItem] = React.useState<any>(null);
  const [passwordForm, setPasswordForm] = React.useState({ old: '', new: '', confirm: '' });
  const [phoneForm, setPhoneForm] = React.useState({ phone: '', code: '' });
  const [codeSent, setCodeSent] = React.useState(false);
  const [codeCountdown, setCodeCountdown] = React.useState(0);

  const getContent = () => {
    switch (type) {
      case 'security':
        return {
          title: t('profile.menu.security', { defaultValue: '安全' }),
          icon: Shield,
          iconBg: 'bg-[#F1F9F1]',
          iconColor: 'text-[#22C55E]',
          subHeadline: t('settings.security.subtitle', { defaultValue: '副标题' }),
          items: [
            { id: 'password', label: t('settings.security.password', { defaultValue: '密码' }), desc: t('settings.security.password_desc', { defaultValue: 'password desc' }) },
            { id: 'phone', label: t('settings.security.phone', { defaultValue: '手机号' }), desc: t('settings.security.phone_desc', { defaultValue: 'phone desc' }) },
            { id: 'devices', label: t('settings.security.devices', { defaultValue: 'devices' }), desc: t('settings.security.devices_desc', { defaultValue: 'devices desc' }) }
          ]
        };
      case 'notifications':
        return {
          title: t('profile.menu.notifications', { defaultValue: '通知' }),
          icon: Bell,
          iconBg: 'bg-[#F0F7FF]',
          iconColor: 'text-blue-500',
          subHeadline: t('settings.notifications.subtitle', { defaultValue: '副标题' }),
          items: [
            { id: 'reminders', label: t('settings.notifications.task_reminder', { defaultValue: 'task reminder' }), desc: t('settings.notifications.task_reminder_desc', { defaultValue: 'task reminder desc' }), isToggle: true },
            { id: 'points', label: t('settings.notifications.points_change', { defaultValue: 'points change' }), desc: t('settings.notifications.points_change_desc', { defaultValue: 'points change desc' }), isToggle: true },
            { id: 'announcements', label: t('settings.notifications.system_announcement', { defaultValue: 'system announcement' }), desc: t('settings.notifications.system_announcement_desc', { defaultValue: 'system announcement desc' }), isToggle: true }
          ]
        };
      case 'basic':
      default:
        return {
          title: t('settings.title', { defaultValue: '标题' }),
          icon: Settings,
          iconBg: 'bg-surface-container-low',
          iconColor: 'text-on-surface-variant',
          subHeadline: t('settings.basic.subtitle', { defaultValue: '副标题' }),
          items: [
            { id: 'language', label: t('settings.language', { defaultValue: '语言' }), desc: getLanguageName(i18n.language) },
            { id: 'cache', label: t('settings.cache', { defaultValue: '清除缓存' }), desc: '24.5 MB' },
            { id: 'about', label: t('settings.about', { defaultValue: '关于' }), desc: t('settings.basic.version', { version: '1.2.0' }) }
          ]
        };
    }
  };

  function getLanguageName(code: string) {
    const languages: Record<string, string> = {
      'zh-CN': '简体中文',
      'en-US': 'English',
      'ja-JP': '日本語',
      'ko-KR': '한국어',
      'es-ES': 'Español',
      'fr-FR': 'Français'
    };
    return languages[code] || '简体中文';
  }

  const content = getContent();

  const handleItemClick = (item: any) => {
    if (item.isToggle) return;
    setActiveItem(item);
  };

  const handleLanguageSelect = (lang: any) => {
    i18n.changeLanguage(lang.value);
    setActiveItem({...activeItem, desc: lang.label});
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-6 pb-24 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex justify-between items-center py-4 bg-[#F8F9FA] sticky top-0 z-40 -mx-6 px-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-extrabold text-lg text-on-surface">{content.title}</h1>
        <div className="w-10" />
      </header>

      <div className="mt-8 flex flex-col items-center mb-10">
        <div className={cn(
          "w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-sm",
          content.iconBg,
          content.iconColor
        )}>
           <content.icon size={40} />
        </div>
        <p className="text-on-surface-variant/60 text-sm font-bold mt-4 tracking-tight">{content.subHeadline}</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline-variant/10 overflow-hidden">
          {content.items.map((item, idx) => (
            <div 
               key={idx} 
               onClick={() => handleItemClick(item)}
               className="flex items-center justify-between p-6 border-b border-outline-variant/5 last:border-0 hover:bg-[#F8F9FA] active:bg-[#F1F3F5] transition-colors cursor-pointer group"
            >
              <div className="flex flex-col">
                <span className="font-black text-[15px] text-on-surface">{item.label}</span>
                <span className="text-xs text-on-surface-variant/50 font-bold mt-1 uppercase tracking-wider">{item.desc}</span>
              </div>
              {item.isToggle ? (
                <div className="w-12 h-7 bg-[#98EE99] rounded-full relative p-1 flex items-center justify-end shadow-inner">
                  <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                </div>
              ) : (
                <ChevronRight size={18} className="text-on-surface-variant/20 group-hover:text-on-surface transition-colors" />
              )}
            </div>
          ))}
        </div>
      </div>
      
      <p className="text-center text-[10px] text-on-surface-variant/30 mt-16 uppercase tracking-[0.2em] font-black">
        {t('welcome.title', { defaultValue: '标题' })} {t('profile.menu.security', { defaultValue: '安全' })}
      </p>

      {/* Mock Detail Modal */}
      <AnimatePresence>
        {activeItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveItem(null)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%', x: 0 }}
              animate={{ y: 0, x: 0 }}
              exit={{ y: '100%', x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[3rem] p-8 pb-12 shadow-2xl safe-area-bottom"
            >
              <div className="w-12 h-1.5 bg-surface-container-highest rounded-full mx-auto mb-8" />
              
              <div className="mb-8">
                <h3 className="text-2xl font-black text-on-surface mb-1">{activeItem.label}</h3>
                <p className="text-on-surface-variant/60 font-bold text-sm tracking-tight">{activeItem.desc}</p>
              </div>
              
              <div className="space-y-6">
                 {activeItem.id === 'password' && (
                   <div className="space-y-4">
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-on-surface-variant ml-2 uppercase tracking-widest">{t('settings.security.old_password', { defaultValue: 'old password' })}</label>
                       <input type="password" placeholder={t('settings.security.password_placeholder', { defaultValue: 'password placeholder' })} className="w-full h-14 bg-surface-container-low rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-on-surface-variant ml-2 uppercase tracking-widest">{t('settings.security.new_password', { defaultValue: 'new password' })}</label>
                       <input type="password" placeholder={t('settings.security.new_password_placeholder', { defaultValue: 'new password placeholder' })} className="w-full h-14 bg-surface-container-low rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-on-surface-variant ml-2 uppercase tracking-widest">{t('settings.security.confirm_password', { defaultValue: 'confirm password' })}</label>
                       <input type="password" placeholder={t('settings.security.confirm_password_placeholder', { defaultValue: 'confirm password placeholder' })} className="w-full h-14 bg-surface-container-low rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                     </div>
                   </div>
                 )}

                  {activeItem.id === 'phone' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-on-surface-variant ml-2 uppercase tracking-widest">{t('settings.security.new_phone', { defaultValue: 'new phone' })}</label>
                        <input type="tel" placeholder={t('settings.security.phone_placeholder', { defaultValue: 'phone placeholder' })} className="w-full h-14 bg-surface-container-low rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-on-surface-variant ml-2 uppercase tracking-widest">{t('settings.security.code', { defaultValue: 'code' })}</label>
                        <div className="relative">
                          <input type="text" placeholder={t('settings.security.code_placeholder', { defaultValue: 'code placeholder' })} className="w-full h-14 bg-surface-container-low rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                           <button type="button" className="absolute right-2 top-2 bottom-2 px-4 bg-primary/10 text-primary rounded-xl font-bold text-xs hover:bg-primary/20 transition-colors">{t('settings.security.get_code', { defaultValue: 'get code' })}</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeItem.id === 'language' && (
                    <div className="space-y-2">
                      {[
                        { code: 'cn', label: '简体中文', value: 'zh-CN' },
                        { code: 'us', label: 'English', value: 'en-US' },
                        { code: 'jp', label: '日本語', value: 'ja-JP' },
                        { code: 'kr', label: '한국어', value: 'ko-KR' },
                        { code: 'es', label: 'Español', value: 'es-ES' },
                        { code: 'fr', label: 'Français', value: 'fr-FR' }
                      ].map((lang) => (
                        <div 
                          key={lang.value}
                          className={cn(
                            "p-2.5 rounded-[1.2rem] flex items-center justify-between cursor-pointer border-2 transition-all",
                            i18n.language === lang.value
                              ? "bg-primary/5 border-primary/20 shadow-sm" 
                              : "bg-surface-container-low border-transparent hover:border-outline-variant/10"
                          )}
                          onClick={() => handleLanguageSelect(lang)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-outline-variant/10 shrink-0",
                              i18n.language === lang.value ? "bg-white" : "bg-white/50"
                            )}>
                              <img 
                                src={`https://flagcdn.com/w80/${lang.code}.png`} 
                                alt={lang.label}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className={cn("text-xs font-black tracking-tight", i18n.language === lang.value ? "text-primary" : "text-on-surface")}>
                              {lang.label}
                            </span>
                          </div>
                          {i18n.language === lang.value && (
                            <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center shadow-md">
                              <Settings size={10} strokeWidth={4} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                 {activeItem.id === 'devices' && (
                   <div className="divide-y divide-outline-variant/10 bg-surface-container-low/50 rounded-2xl overflow-hidden">
                      <div className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-on-surface-variant"><Smartphone size={20} /></div>
                            <div>
                               <p className="font-bold text-sm">iPhone 15 Pro</p>
                               <p className="text-[10px] text-[#22C55E] font-black uppercase">{t('settings.security.current_device', { defaultValue: 'current device' })}</p>
                            </div>
                         </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3 opacity-60">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-on-surface-variant"><Smartphone size={20} /></div>
                            <div>
                               <p className="font-bold text-sm">iPad Air</p>
                               <p className="text-[10px] text-on-surface-variant font-black uppercase">{t('settings.security.active_time', { time: '2h' })}</p>
                            </div>
                         </div>
                         <button onClick={async () => { if (await showConfirm({ message: '确定要退出该设备吗？' })) { showToastGlobal('已退出该设备', 'success'); setActiveItem(null); } }} className="text-red-500 font-bold text-xs hover:bg-red-50 px-3 py-1 rounded-lg transition-colors">{t('settings.security.logout_device', { defaultValue: 'logout device' })}</button>
                      </div>
                   </div>
                 )}
                
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setActiveItem(null)}
                    className="flex-1 py-4 bg-surface-container-highest text-on-surface rounded-2xl font-black active:scale-95 transition-transform"
                  >
                     {t('common.cancel', { defaultValue: '取消' })}
                  </button>
                  <button 
                    onClick={() => setActiveItem(null)}
                    className="flex-[2] py-4 bg-on-surface text-white rounded-2xl font-black shadow-lg shadow-on-surface/20 active:scale-95 transition-transform"
                  >
                     {t('common.save', { defaultValue: '保存' })}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
