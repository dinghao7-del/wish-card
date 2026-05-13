import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  verificationValue?: string;
  verificationMatcher?: (input: string) => boolean;
  verificationLabel?: string;
  verificationPlaceholder?: string;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'danger' | 'warning' | 'info';
  verificationValue?: string;
  verificationMatcher?: (input: string) => boolean;
  verificationLabel?: string;
  verificationPlaceholder?: string;
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type,
  verificationValue,
  verificationMatcher,
  verificationLabel,
  verificationPlaceholder,
}: ConfirmDialogProps) {
  const [verificationInput, setVerificationInput] = useState('');
  const requiresVerification = !!verificationValue || !!verificationMatcher;
  const canConfirm = !requiresVerification || (
    verificationMatcher ? verificationMatcher(verificationInput) : verificationInput === verificationValue
  );

  const typeStyles = {
    danger: {
      icon: AlertTriangle,
      confirmClass: 'ui-danger-button',
      iconBg: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300',
    },
    warning: {
      icon: AlertTriangle,
      confirmClass: 'ui-warning-button',
      iconBg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    },
    info: {
      icon: Info,
      confirmClass: 'ui-primary-button',
      iconBg: 'bg-primary/10 text-primary',
    },
  };

  const styles = typeStyles[type];
  const Icon = styles.icon;
  const closeDialog = () => {
    setVerificationInput('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={closeDialog}
          />

          {/* 对话框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="ui-panel relative max-h-[calc(100svh-2rem)] w-full max-w-sm overflow-y-auto"
          >
            {/* 图标区域 */}
            <div className="flex justify-center pt-6 pb-2">
              <div className={cn('flex h-16 w-16 items-center justify-center rounded-full', styles.iconBg)}>
                <Icon size={30} strokeWidth={2.5} />
              </div>
            </div>

            {/* 内容区域 */}
            <div className="px-6 pb-6 text-center">
              <h3 className="mb-2 text-lg font-black text-on-surface">
                {title}
              </h3>
              <p className="mb-6 text-sm font-semibold leading-6 text-on-surface-variant">
                {message}
              </p>

              {requiresVerification && (
                <div className="mb-6 text-left">
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-on-surface-variant/70">
                    {verificationLabel || '家长确认'}
                  </label>
                  <input
                    autoFocus
                    type="password"
                    value={verificationInput}
                    onChange={(event) => setVerificationInput(event.target.value)}
                    placeholder={verificationPlaceholder || '请输入家长 PIN 或密码'}
                    className="w-full rounded-2xl border border-outline-variant/40 bg-surface-container-low px-4 py-3 text-center font-bold tracking-widest text-on-surface outline-none transition-colors focus:border-primary"
                  />
                </div>
              )}

              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={closeDialog}
                  className="ui-secondary-button flex-1"
                >
                  {cancelText}
                </button>
                <button
                  disabled={!canConfirm}
                  onClick={() => {
                    if (!canConfirm) return;
                    onConfirm();
                    setVerificationInput('');
                  }}
                  className={cn('flex-1', styles.confirmClass)}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// 全局确认对话框管理器
let confirmResolver: ((value: boolean) => void) | null = null;

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmOptions & { resolve: (value: boolean) => void } | null>(null);

  const showConfirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setDialog({ ...options, resolve });
    });
  };

  const handleClose = () => {
    if (dialog) {
      dialog.resolve(false);
      setDialog(null);
    }
  };

  const handleConfirm = () => {
    if (dialog) {
      dialog.resolve(true);
      setDialog(null);
    }
  };

  // 导出全局方法
  (window as any).__showConfirm = showConfirm;

  return (
    <>
      {children}
      <ConfirmDialog
        isOpen={dialog !== null}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={dialog?.title || '确认操作'}
        message={dialog?.message || ''}
        confirmText={dialog?.confirmText || '确认'}
        cancelText={dialog?.cancelText || '取消'}
        type={dialog?.type || 'info'}
        verificationValue={dialog?.verificationValue}
        verificationMatcher={dialog?.verificationMatcher}
        verificationLabel={dialog?.verificationLabel}
        verificationPlaceholder={dialog?.verificationPlaceholder}
      />
    </>
  );
}

// 全局确认函数
export async function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    if ((window as any).__showConfirm) {
      (window as any).__showConfirm(options).then(resolve);
    } else {
      // 降级到原生 confirm
      resolve(window.confirm(options.message));
    }
  });
}
