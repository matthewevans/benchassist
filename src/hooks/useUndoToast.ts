import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAppContext } from '@/hooks/useAppContext.ts';
import type { AppAction } from '@/context/AppContext.tsx';

const UNDOABLE_ACTIONS = new Set<AppAction['type']>([
  'DELETE_TEAM',
  'DELETE_ROSTER',
  'DELETE_PLAYER',
  'DELETE_GAME',
  'DELETE_GAME_CONFIG',
  'IMPORT_DATA',
  'MERGE_DATA',
]);

/**
 * Returns a dispatch function that shows an undo toast for destructive actions.
 * Use this instead of raw `dispatch` when deleting entities.
 */
export function useUndoToast() {
  const { dispatch, undo } = useAppContext();

  const dispatchWithUndo = useCallback(
    (action: AppAction) => {
      dispatch(action);

      if (UNDOABLE_ACTIONS.has(action.type)) {
        toast('Action completed', {
          action: {
            label: 'Undo',
            onClick: () => {
              undo();
            },
          },
          duration: 8000,
        });
      }
    },
    [dispatch, undo],
  );

  return dispatchWithUndo;
}
