'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = 'chunk-error-reload';

export default function ChunkErrorReload() {
  useEffect(() => {
    const isChunkError = (message: unknown) =>
      typeof message === 'string' && /ChunkLoadError|Loading chunk [\d]+ failed/.test(message);

    const reloadOnce = () => {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => {
      if (isChunkError(e.message)) reloadOnce();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason?.message)) reloadOnce();
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
