import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, X, BellRing } from 'lucide-react';

export type ToastType = 'info' | 'warning' | 'urgent' | 'critical';

interface NotificationToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    info: 'bg-blue-600 text-white',
    warning: 'bg-amber-500 text-white',
    urgent: 'bg-orange-600 text-white',
    critical: 'bg-red-600 text-white',
  };

  const icons = {
    info: <BellRing size={20} />,
    warning: <AlertTriangle size={20} />,
    urgent: <AlertCircle size={20} />,
    critical: <AlertTriangle size={20} />,
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[100] p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${styles[type]} backdrop-blur-md`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <span className="text-sm font-bold leading-tight">{message}</span>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
        <X size={18} />
      </button>
    </div>
  );
};