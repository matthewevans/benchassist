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
        toast(description, {
          action: {
            label: t('actions.undo'),
            onClick: undo,
          },
          duration: 8000,
        });
      }
    },
    [dispatch, undo, state, t],
  );

  return dispatchWithUndo;
}
