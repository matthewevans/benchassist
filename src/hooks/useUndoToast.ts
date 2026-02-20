import { useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/hooks/useAppContext.ts';
import type { AppAction } from '@/context/AppContext.tsx';
import { UNDOABLE_ACTIONS, getUndoDescription } from '@/hooks/useUndoReducer.ts';

/**
 * Returns a dispatch function that shows an undo toast for destructive actions.
 * Use this instead of raw `dispatch` when deleting entities.
 */
export function useUndoToast() {
  const { dispatch, undo, state } = useAppContext();
  const { t } = useTranslation();

  const dispatchWithUndo = useCallback(
    (action: AppAction) => {
      // Capture description before dispatch so we read pre-action state
      const description = UNDOABLE_ACTIONS.has(action.type)
        ? getUndoDescription(action, state)
        : null;

      dispatch(action);

      if (description) {
        // Keep a single undo toast visible so it doesn't stack over navigation controls.
        toast.dismiss('undo-action');
        toast(description, {
          id: 'undo-action',
          action: {
            label: t('actions.undo'),
            onClick: undo,
          },
          duration: 4000,
        });
      }
    },
    [dispatch, undo, state, t],
  );

  return dispatchWithUndo;
}
