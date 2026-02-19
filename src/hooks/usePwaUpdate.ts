import { useSyncExternalStore } from 'react';
import {
  applyPwaUpdate,
  checkForPwaUpdate,
  getPwaUpdateSnapshot,
  subscribePwaUpdate,
} from '@/pwa/registerServiceWorker.ts';

export function usePwaUpdate() {
  const { isUpdateAvailable } = useSyncExternalStore(
    subscribePwaUpdate,
    getPwaUpdateSnapshot,
    getPwaUpdateSnapshot,
  );

  return {
    isUpdateAvailable,
    applyUpdate: applyPwaUpdate,
    checkForUpdate: checkForPwaUpdate,
  };
}
