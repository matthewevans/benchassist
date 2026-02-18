import { Card, CardContent } from '@/components/ui/card.tsx';

interface SolverStatusCardProps {
  isRunning: boolean;
  progress: number;
  message: string;
  error: string | null;
}

export function SolverStatusCard({ isRunning, progress, message, error }: SolverStatusCardProps) {
  return (
    <>
      {isRunning && (
        <Card>
          <CardContent className="py-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{message}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
