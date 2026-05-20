import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export interface TopAppBarProps {
  /** 页面标题 */
  title: string;
  /** 是否显示返回按钮，默认 true */
  showBack?: boolean;
  /** 自定义返回路径，不指定则回退到浏览器历史上一页 */
  backTo?: string;
  /** 自定义返回回调，若提供则优先于 backTo 和默认行为 */
  onBack?: () => void;
  /** 右侧操作区 */
  rightContent?: React.ReactNode;
  /** 额外的 CSS 类 */
  className?: string;
}

/**
 * 统一的顶部导航栏组件
 * 
 * 使用场景：
 * - 所有二级/深层页面（创建任务、打卡确认、兑换奖励等）
 * - 工具页面（番茄钟、四象限、日历同步）
 * - 设置子页面
 * 
 * 规范：
 * - 返回按钮：44x44pt 最小触摸区域
 * - 标题居中，字体 17px bold
 * - 高度 56px，含底部边框
 */
export function TopAppBar({
  title,
  showBack = true,
  backTo,
  onBack,
  rightContent,
  className,
}: TopAppBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        'ui-top-app-bar sticky top-[var(--app-sticky-top,0px)] z-40 flex items-end justify-between',
        'min-h-14 px-4 pb-1 pt-[max(0.5rem,env(safe-area-inset-top,0px))]',
        'bg-surface/90 backdrop-blur-xl',
        'border-b border-outline-variant/30',
        className
      )}
    >
      {/* 左侧：返回按钮 */}
      <div className="flex items-center min-w-[44px]">
        {showBack && (
          <button
            onClick={handleBack}
            className="ui-icon-button"
            aria-label={t('common.back', { defaultValue: '返回' })}
            type="button"
          >
            <ArrowLeft size={22} />
          </button>
        )}
      </div>

      {/* 中间：标题 */}
      <h1 className="text-[17px] font-semibold text-on-surface truncate mx-2">
        {title}
      </h1>

      {/* 右侧：操作区 */}
      <div className="flex items-center min-w-[44px] justify-end">
        {rightContent}
      </div>
    </header>
  );
}
