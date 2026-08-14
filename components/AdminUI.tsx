'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Toast = { id: number; message: string; kind: 'success' | 'error' };
type ConfirmState = { message: string; resolve: (ok: boolean) => void } | null;

interface AdminUIContextValue {
  showToast: (message: string, kind?: 'success' | 'error') => void;
  confirm: (message: string) => Promise<boolean>;
}

const AdminUIContext = createContext<AdminUIContextValue | null>(null);

export function AdminUIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
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
            {t.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="admin-confirm-backdrop" onClick={() => onConfirmChoice(false)}>
          <div className="admin-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-confirm-message">{confirmState.message}</div>
            <div className="admin-confirm-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onConfirmChoice(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => onConfirmChoice(true)}>
                Delete
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
