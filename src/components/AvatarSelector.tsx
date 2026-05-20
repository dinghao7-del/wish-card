/**
 * 头像选择器组件
 * 显示本地 PNG 亚洲风卡通头像
 */
import React, { useState } from 'react';
import { X, Baby, User, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { BOY_AVATARS, GIRL_AVATARS, PARENT_AVATARS, GRANDPARENT_AVATARS } from '../lib/templates';
import { localeText, type LocaleText } from '../lib/localeText';

interface AvatarSelectorProps {
  onSelect: (avatarUrl: string) => void;
  onClose: () => void;
  currentAvatar?: string;
}

type AvatarTab = 'boy' | 'girl' | 'parent' | 'grandparent';

const TABS: { key: AvatarTab; icon: React.ElementType; avatars: typeof BOY_AVATARS }[] = [
  { key: 'boy', icon: Baby, avatars: BOY_AVATARS },
  { key: 'girl', icon: Baby, avatars: GIRL_AVATARS },
  { key: 'parent', icon: User, avatars: PARENT_AVATARS },
  { key: 'grandparent', icon: User, avatars: GRANDPARENT_AVATARS },
];

export function AvatarSelector({ onSelect, onClose, currentAvatar }: AvatarSelectorProps) {
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<AvatarTab>('boy');
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);

  // 确认选择
  const handleConfirm = () => {
    if (selectedSrc) {
      onSelect(selectedSrc);
      onClose();
    }
  };

  const activeTabData = TABS.find(t => t.key === activeTab)!;
  const text = (copy: LocaleText) =>
    localeText(i18n.language, copy);
  const tabLabel = (key: AvatarTab) => {
    const labels: Record<AvatarTab, LocaleText> = {
      boy: { 'zh-CN': '男孩', 'en-US': 'Boys', 'ja-JP': '男の子', 'ko-KR': '남아', 'es-ES': 'Niños', 'fr-FR': 'Garçons' },
      girl: { 'zh-CN': '女孩', 'en-US': 'Girls', 'ja-JP': '女の子', 'ko-KR': '여아', 'es-ES': 'Niñas', 'fr-FR': 'Filles' },
      parent: { 'zh-CN': '父母', 'en-US': 'Parents', 'ja-JP': '保護者', 'ko-KR': '부모', 'es-ES': 'Padres', 'fr-FR': 'Parents' },
      grandparent: { 'zh-CN': '爷爷奶奶', 'en-US': 'Grandparents', 'ja-JP': '祖父母', 'ko-KR': '조부모', 'es-ES': 'Abuelos', 'fr-FR': 'Grands-parents' },
    };
    return text(labels[key]);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-surface flex flex-col pt-safe"
    >
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <X size={24} />
        </button>
        <h2 className="text-lg font-bold">{text({ 'zh-CN': '选择头像', 'en-US': 'Choose Avatar', 'ja-JP': 'アバターを選択', 'ko-KR': '아바타 선택', 'es-ES': 'Elegir avatar', 'fr-FR': 'Choisir un avatar' })}</h2>
        <button 
          onClick={handleConfirm}
          disabled={!selectedSrc}
          className={cn(
            "px-5 py-2 rounded-xl font-bold text-sm transition-all",
            selectedSrc 
              ? "bg-primary text-on-primary active:scale-95" 
              : "bg-surface-container-low text-on-surface-variant/30"
          )}
        >
          <Check size={18} className="inline mr-1" />
          {text({ 'zh-CN': '确认', 'en-US': 'Confirm', 'ja-JP': '確認', 'ko-KR': '확인', 'es-ES': 'Confirmar', 'fr-FR': 'Confirmer' })}
        </button>
      </header>

      {/* Tab 切换 */}
      <div className="flex gap-2 px-4 py-3 border-b border-outline-variant/10">
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
              activeTab === key
                ? "bg-secondary-container text-secondary"
                : "bg-surface-container-low text-on-surface-variant/60"
            )}
          >
            <Icon size={14} />
            {tabLabel(key)}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden p-3">
        <div className="grid grid-cols-5 gap-2 overflow-y-auto no-scrollbar content-start max-h-[calc(100svh-180px)]">
          {activeTabData.avatars.map((avatar) => {
            const isSelected = selectedSrc === avatar.src || currentAvatar === avatar.src;
            return (
              <button
                key={avatar.id}
                onClick={() => setSelectedSrc(avatar.src)}
                className={cn(
                  "relative aspect-square rounded-xl overflow-hidden border-2 transition-all active:scale-95",
                  isSelected ? "border-primary scale-105 shadow-lg" : "border-transparent hover:border-primary/30"
                )}
              >
                <img src={avatar.src} alt={avatar.name} className="w-full h-full object-cover" />
                {isSelected && (
                  <div className="absolute bottom-0.5 right-0.5 bg-primary text-white rounded-full p-0.5 shadow-md">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
