import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';

interface SolverStatusCardProps {
  isRunning: boolean;
  progress: number;
  message: string;
  error: string | null;
  onCancel?: () => void;
}

// Maps solver message keys (with 'game:' prefix) to their game namespace key paths
const SOLVER_KEY_MAP: Record<string, string> = {
  'game:solver.initializing': 'solver.initializing',
  'game:solver.calculating_goalie': 'solver.calculating_goalie',
  'game:solver.generating_patterns': 'solver.generating_patterns',
  'game:solver.building_schedule': 'solver.building_schedule',
  'game:solver.complete': 'solver.complete',
  'game:solver.searching': 'solver.searching',
};

function useTranslatedMessage(message: string): string {
  const { t } = useTranslation('game');

  if (!message) return message;

  // Check if message is a JSON-encoded parameterized key (e.g. solver.searching with combinations)
  if (message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message) as { key: string; combinations?: string };
      if (SOLVER_KEY_MAP[parsed.key]) {
        return t('solver.searching', { combinations: parsed.combinations ?? '' });
      }
    } catch {
      // Not valid JSON — fall through
    }
  }

  // Check if message is a plain solver key
  const localKey = SOLVER_KEY_MAP[message];
  if (localKey) {
    const keyPath = localKey as
      | 'solver.initializing'
      | 'solver.calculating_goalie'
      | 'solver.generating_patterns'
      | 'solver.building_schedule'
      | 'solver.complete';
    return t(keyPath);
  }

  return message;
}

export function SolverStatusCard({
  isRunning,
  progress,
  message,
  error,
  onCancel,
}: SolverStatusCardProps) {
  const displayMessage = useTranslatedMessage(message);
  const { t: tCommon } = useTranslation('common');

  return (
    <>
      {isRunning && (
        <div className="bg-card rounded-[10px] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
          <div className="flex justify-between text-ios-footnote mb-1.5">
            <span>{displayMessage}</span>
            <span className="text-muted-foreground tabular-nums">{progress}%</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-11 min-w-[70px]"
                onClick={onCancel}
              >
                {tCommon('actions.stop')}
              </Button>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="bg-card rounded-[10px] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none border border-destructive/30">
          <p className="text-ios-footnote text-destructive">{error}</p>
        </div>
      )}
    </>
  );
}
