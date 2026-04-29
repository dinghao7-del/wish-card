import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
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
}: ConfirmDialogProps) {
  const typeStyles = {
    danger: {
      icon: '⚠️',
      confirmBg: 'bg-red-500 hover:bg-red-600',
      iconBg: 'bg-red-100 text-red-600',
    },
    warning: {
      icon: '⚠️',
      confirmBg: 'bg-yellow-500 hover:bg-yellow-600',
      iconBg: 'bg-yellow-100 text-yellow-600',
    },
    info: {
      icon: 'ℹ️',
      confirmBg: 'bg-blue-500 hover:bg-blue-600',
      iconBg: 'bg-blue-100 text-blue-600',
    },
  };

  const styles = typeStyles[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* 对话框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            {/* 图标区域 */}
            <div className="flex justify-center pt-6 pb-2">
              <div className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center text-3xl`}>
                {styles.icon}
              </div>
            </div>

            {/* 内容区域 */}
            <div className="px-6 pb-6 text-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                {message}
              </p>

              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 py-3 rounded-xl text-white font-semibold transition-colors ${styles.confirmBg}`}
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
