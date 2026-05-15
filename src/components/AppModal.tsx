import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';

type ModalSurface = 'sheet' | 'center' | 'fullscreen';

interface AppModalProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  open: boolean;
  onClose: () => void;
  surface?: ModalSurface;
  zIndexClass?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  closeLabel?: string;
}

export function AppModal({
  children,
  title,
  open,
  onClose,
  surface = 'sheet',
  zIndexClass = 'z-[120]',
  headerAction,
  footer,
  className,
  bodyClassName,
  closeLabel = '关闭',
}: AppModalProps) {
  if (!open) return null;

  const isFullscreen = surface === 'fullscreen';
  const isCenter = surface === 'center';

  return (
    <div
      className={cn(
        'ui-app-modal fixed inset-0 flex bg-black/55 backdrop-blur-sm',
        isFullscreen ? 'items-stretch justify-stretch p-0' : isCenter ? 'items-center justify-center p-4' : 'items-end justify-center p-0',
        zIndexClass
      )}
    >
      {!isFullscreen && (
        <motion.button
          type="button"
          aria-label={closeLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-default"
          onClick={onClose}
        />
      )}

      <motion.div
        initial={isFullscreen ? { opacity: 0 } : isCenter ? { opacity: 0, scale: 0.94, y: 12 } : { y: '100%' }}
        animate={isFullscreen ? { opacity: 1 } : isCenter ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={isFullscreen ? { opacity: 0 } : isCenter ? { opacity: 0, scale: 0.94, y: 12 } : { y: '100%' }}
        transition={surface === 'sheet' ? { type: 'spring', damping: 28, stiffness: 320 } : { duration: 0.18 }}
        className={cn(
          'ui-app-modal-panel relative z-10 flex w-full flex-col bg-surface text-on-surface shadow-2xl',
          isFullscreen && 'h-[100svh] max-h-[100svh] pt-safe',
          isCenter && 'max-h-[calc(100svh-2rem)] max-w-sm rounded-[2rem]',
          surface === 'sheet' && 'max-h-[86svh] max-w-lg rounded-t-[2rem]',
          className
        )}
      >
        {(title || headerAction || isFullscreen || isCenter || surface === 'sheet') && (
          <header className="ui-app-modal-header flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/10 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="ui-app-modal-close flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
            >
              <Plus size={24} className="rotate-45" strokeWidth={2.8} />
            </button>
            {title && <h2 className="min-w-0 flex-1 text-center text-lg font-black leading-tight">{title}</h2>}
            <div className="flex h-10 min-w-10 items-center justify-end">
              {headerAction}
            </div>
          </header>
        )}

        <div className={cn('ui-app-modal-body min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 py-4', bodyClassName)}>
          {children}
        </div>

        {footer && (
          <footer className="ui-app-modal-footer shrink-0 border-t border-outline-variant/10 bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            {footer}
          </footer>
        )}
      </motion.div>
    </div>
  );
}

interface TemplatePickerShellProps {
  title: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  search?: React.ReactNode;
  tabs?: React.ReactNode;
  footer?: React.ReactNode;
  zIndexClass?: string;
}

export function TemplatePickerShell({
  title,
  children,
  onClose,
  search,
  tabs,
  footer,
  zIndexClass = 'z-[160]',
}: TemplatePickerShellProps) {
  return (
    <AppModal
      open
      surface="fullscreen"
      title={title}
      onClose={onClose}
      zIndexClass={zIndexClass}
      bodyClassName="px-5 py-4"
      footer={footer}
    >
      {search && <div className="mb-3">{search}</div>}
      {tabs && <div className="mb-3">{tabs}</div>}
      {children}
    </AppModal>
  );
}
