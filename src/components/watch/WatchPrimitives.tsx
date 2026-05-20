import type { ReactNode } from 'react';

export function WatchHeader({ title, badge, tone = 'star' }: { title: string; badge?: string; tone?: 'star' | 'sport' | 'place' | 'privacy' }) {
  return (
    <div className="watch-head">
      <h3>{title}</h3>
      {badge && <span className={`watch-pill watch-pill-${tone}`}>{badge}</span>}
    </div>
  );
}

export function WatchPanel({ children }: { children: ReactNode }) {
  return <div className="watch-panel">{children}</div>;
}

export function WatchMetric({ value, unit, tone = 'star' }: { value: string | number; unit?: string; tone?: 'star' | 'sport' | 'place' | 'plain' }) {
  return (
    <div className="watch-metric">
      <strong className={`watch-metric-${tone}`}>{value}</strong>
      {unit && <span>{unit}</span>}
    </div>
  );
}

export function WatchProgress({ percent, tone = 'star' }: { percent: number; tone?: 'star' | 'sport' | 'place' }) {
  return (
    <div className={`watch-progress watch-progress-${tone}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

export function WatchActions({ primary, secondary, tone = 'default' }: { primary: string; secondary?: string; tone?: 'default' | 'sport' | 'place' }) {
  return (
    <div className={secondary ? 'watch-actions' : 'watch-actions watch-actions-single'}>
      <button className={`watch-button watch-button-${tone}`} type="button">{primary}</button>
      {secondary && <button className="watch-button watch-button-secondary" type="button">{secondary}</button>}
    </div>
  );
}

export function WatchTabBar({ active }: { active: 'today' | 'stars' | 'wish' }) {
  return (
    <div className="watch-tabbar" aria-label="手表主导航">
      <span className={active === 'today' ? 'active' : ''}>今日</span>
      <span className={active === 'stars' ? 'active' : ''}>星星</span>
      <span className={active === 'wish' ? 'active' : ''}>愿望</span>
    </div>
  );
}

export function WatchPermissionNotice({ children }: { children: ReactNode }) {
  return (
    <div className="watch-permission">
      <i />
      <span>{children}</span>
    </div>
  );
}
