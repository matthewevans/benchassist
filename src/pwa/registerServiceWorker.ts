import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

const UPDATE_TOAST_ID = 'pwa-update-ready';
const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

type PwaUpdateSnapshot = {
  isUpdateAvailable: boolean;
};

const snapshot: PwaUpdateSnapshot = {
  isUpdateAvailable: false,
};

const listeners = new Set<() => void>();

let isRegistered = false;
let registration: ServiceWorkerRegistration | null = null;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
let cleanupRegistrationWatchers: (() => void) | null = null;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setUpdateAvailable(isUpdateAvailable: boolean) {
  if (snapshot.isUpdateAvailable === isUpdateAvailable) {
    return;
  }

  snapshot.isUpdateAvailable = isUpdateAvailable;
  emitChange();
}

export function subscribePwaUpdate(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPwaUpdateSnapshot() {
  return snapshot;
}

export function checkForPwaUpdate() {
  if (!registration) {
    return;
  }

  void registration.update();
}

export async function applyPwaUpdate() {
  if (!updateSW) {
    return;
  }

  toast.dismiss(UPDATE_TOAST_ID);
  setUpdateAvailable(false);
  await updateSW(true);
}

export function registerServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator) || isRegistered) {
    return;
  }

  isRegistered = true;

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkForPwaUpdate();
    }
  };

  const handleFocus = () => {
    checkForPwaUpdate();
  };

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      setUpdateAvailable(true);
      toast('Update available', {
        id: UPDATE_TOAST_ID,
        description: 'A new version is ready. Refresh to use the latest improvements.',
        duration: Infinity,
        action: {
          label: 'Refresh',
          onClick: () => {
            void applyPwaUpdate();
          },
        },
      });
    },
    onRegisteredSW(_swUrl, swRegistration) {
      if (!swRegistration) {
        return;
      }

      cleanupRegistrationWatchers?.();
      registration = swRegistration;
      checkForPwaUpdate();

      const intervalId = window.setInterval(checkForPwaUpdate, UPDATE_CHECK_INTERVAL_MS);

      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      const cleanup = () => {
        window.clearInterval(intervalId);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };

      cleanupRegistrationWatchers = cleanup;

      window.addEventListener(
        'beforeunload',
        () => {
          cleanup();
          cleanupRegistrationWatchers = null;
        },
        { once: true },
      );
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });
}
