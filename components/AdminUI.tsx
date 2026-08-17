'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n';

type Toast = { id: number; message: string; kind: 'success' | 'error'; action?: { label: string; onClick: () => void } };
type ConfirmState = { message: string; resolve: (ok: boolean) => void } | null;

interface ToastOptions {
  kind?: 'success' | 'error';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface AdminUIContextValue {
  showToast: (message: string, kindOrOptions?: 'success' | 'error' | ToastOptions) => void;
  confirm: (message: string) => Promise<boolean>;
}

const AdminUIContext = createContext<AdminUIContextValue | null>(null);

export function AdminUIProvider({ children }: { children: ReactNode }) {
  const { t: translate } = useLanguage();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, kindOrOptions?: 'success' | 'error' | ToastOptions) => {
    const opts: ToastOptions = typeof kindOrOptions === 'string' ? { kind: kindOrOptions } : (kindOrOptions ?? {});
    const kind = opts.kind ?? 'success';
    const duration = opts.duration ?? (opts.action ? 5000 : 3000);
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, kind, action: opts.action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const onConfirmChoice = (ok: boolean) => {
    confirmState?.resolve(ok);
    setConfirmState(null);
  };

  return (
    <AdminUIContext.Provider value={{ showToast, confirm }}>
      {children}

      <div className="admin-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`admin-toast admin-toast-${t.kind}`}>
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="admin-toast-action"
                onClick={() => {
                  t.action!.onClick();
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="admin-confirm-backdrop" onClick={() => onConfirmChoice(false)}>
          <div className="admin-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-confirm-message">{confirmState.message}</div>
            <div className="admin-confirm-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onConfirmChoice(false)}>
                {translate('adminUI.cancel')}
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => onConfirmChoice(true)}>
                {translate('adminUI.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminUIContext.Provider>
  );
}

export function useAdminUI() {
  const ctx = useContext(AdminUIContext);
  if (!ctx) throw new Error('useAdminUI must be used within AdminUIProvider');
  return ctx;
}
