import { useEffect } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) onClose();
  };

  const confirmStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-orange-500 hover:bg-orange-600 text-white',
    default: 'bg-green-600 hover:bg-green-700 text-white',
  }[variant];

  const iconBg = {
    danger: 'bg-red-50',
    warning: 'bg-orange-50',
    default: '',
  }[variant];

  const iconColor = {
    danger: 'text-red-500',
    warning: 'text-orange-500',
    default: '',
  }[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-dynaton-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dynaton-border">
          <div className="flex items-center gap-3">
            {variant !== 'default' && (
              <div className={`p-2 rounded-xl ${iconBg}`}>
                <AlertTriangle className={`w-5 h-5 ${iconColor}`} />
              </div>
            )}
            <h3 className="font-display text-base font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-dynaton-gray text-dynaton-muted disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-dynaton-gray border-t border-dynaton-border">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-dynaton-border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors ${confirmStyles}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
