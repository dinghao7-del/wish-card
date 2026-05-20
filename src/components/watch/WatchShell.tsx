import type { ReactNode } from 'react';

type WatchShellProps = {
  time?: string;
  children: ReactNode;
};

export function WatchShell({ time = '18:28', children }: WatchShellProps) {
  return (
    <div className="watch-shell" aria-label="小天才手表 320 乘 360 预览">
      <div className="watch-inner">
        <div className="watch-status" aria-label="手表状态栏">
          <span className="watch-signal" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>{time}</span>
          <span className="watch-battery" aria-hidden="true" />
        </div>
        {children}
      </div>
    </div>
  );
}
