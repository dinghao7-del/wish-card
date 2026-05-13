import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, Trophy, User, Sparkles, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

const navItems: Array<{
  to: string;
  icon: LucideIcon;
  labelKey: string;
  defaultLabel: string;
  variant?: 'default' | 'highlight';
}> = [
  { to: '/', icon: Home, labelKey: 'nav.home', defaultLabel: '首页' },
  { to: '/tasks', icon: ClipboardList, labelKey: 'nav.tasks', defaultLabel: '任务' },
  { to: '/habits', icon: Sparkles, labelKey: 'nav.habits', defaultLabel: '奖惩', variant: 'highlight' },
  { to: '/rewards', icon: Trophy, labelKey: 'nav.rewards', defaultLabel: '心愿' },
  { to: '/profile', icon: User, labelKey: 'nav.profile', defaultLabel: '我的' },
];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="ui-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant/10 bg-background/95 px-2 pt-2 backdrop-blur-lg sm:px-4 dark:bg-surface/95" style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0px))' }}>
      <div className="grid grid-cols-5 items-center max-w-lg mx-auto h-16">
        {navItems.map(({ to, icon, labelKey, defaultLabel, variant }) => (
          <NavItem
            key={to}
            to={to}
            icon={icon}
            label={t(labelKey, { defaultValue: defaultLabel })}
            variant={variant}
          />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ to, icon: Icon, label, variant = 'default' }: { to: string; icon: LucideIcon; label: string; variant?: 'default' | 'highlight' }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => cn(
        "flex min-w-0 flex-col items-center justify-end h-full px-1 sm:px-3 pb-2.5 rounded-2xl transition-all duration-300",
        isActive && "ui-bottom-nav-item-active",
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
          <span className="w-full truncate text-center text-[11px] font-bold tracking-tight">{label}</span>
        </>
      )}
    </NavLink>
  );
}
