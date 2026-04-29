import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, Plus, Trophy, User, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-background/95 dark:bg-surface/95 backdrop-blur-lg border-t border-outline-variant/5">
      <div className="flex justify-around items-center max-w-lg mx-auto h-20">
        <NavItem to="/" icon={Home} label={t('nav.home', { defaultValue: '首页' })} />
        <NavItem to="/tasks" icon={ClipboardList} label={t('nav.tasks', { defaultValue: '任务' })} />
        
        {/* Center Prominent Button - Now consistent size */}
        <NavItem to="/habits" icon={Sparkles} label={t('nav.rewards', { defaultValue: '奖励' })} variant="highlight" />

        <NavItem to="/rewards" icon={Trophy} label={t('nav.wishlist', { defaultValue: '心愿单' })} />
        <NavItem to="/profile" icon={User} label={t('nav.profile', { defaultValue: '我的' })} />
      </div>
    </nav>
  );
}

function NavItem({ to, icon: Icon, label, variant = 'default' }: { to: string; icon: any; label: string; variant?: 'default' | 'highlight' }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => cn(
        "flex flex-col items-center justify-end h-full px-3 sm:px-5 pb-2.5 rounded-2xl transition-all duration-300 min-w-[64px]",
        isActive && variant === 'default'
          ? "bg-primary/10 text-primary" 
          : isActive && variant === 'highlight'
            ? "text-primary dark:text-primary"
            : "text-on-surface-variant/60"
      )}
    >
      {({ isActive }) => (
        <>
          {variant === 'highlight' ? (
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 mb-1",
              isActive 
                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" 
                : "bg-surface-container text-on-surface-variant/60 hover:bg-surface-container-high"
            )}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
          ) : (
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-all mb-1", isActive && "fill-primary/10")} />
          )}
          <span className="text-[11px] font-bold tracking-tight">{label}</span>
        </>
      )}
    </NavLink>
  );
}
