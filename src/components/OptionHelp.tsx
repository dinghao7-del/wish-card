import React from 'react';
import { CircleHelp } from 'lucide-react';
import { AppModal } from './AppModal';
import { cn } from '../lib/utils';

interface OptionHelpProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function OptionHelp({ title, children, className }: OptionHelpProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={`${title}说明`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "ui-option-help inline-flex h-6 min-h-6 w-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-transparent text-on-surface-variant/45 active:scale-95",
          className,
        )}
      >
        <CircleHelp size={16} strokeWidth={2.3} />
      </button>
      {open && (
        <AppModal
          open={open}
          onClose={() => setOpen(false)}
          title={title}
          surface="center"
          zIndexClass="z-[180]"
        >
          <div className="rounded-3xl bg-surface-container-low p-4 text-sm font-bold leading-relaxed text-on-surface-variant">
            {children}
          </div>
        </AppModal>
      )}
    </>
  );
}
