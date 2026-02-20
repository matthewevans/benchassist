import { useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/hooks/useAppContext.ts';
import type { AppAction } from '@/context/AppContext.tsx';
import { UNDOABLE_ACTIONS } from '@/hooks/useUndoReducer.ts';

/**
 * Returns a dispatch function that shows an undo toast for destructive actions.
 * Use this instead of raw `dispatch` when deleting entities.
 */
export function useUndoToast() {
  const { dispatch, undo } = useAppContext();
  const { t } = useTranslation();

  const dispatchWithUndo = useCallback(
    (action: AppAction) => {
      dispatch(action);

      if (UNDOABLE_ACTIONS.has(action.type)) {
        toast(t('toast.action_completed'), {
          action: {
            label: t('actions.undo'),
            onClick: () => {
              undo();
            },
          },
          duration: 8000,
        });
      }
    },
    [dispatch, undo, t],
  );

  return dispatchWithUndo;
}
