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
        <div className="bg-card rounded-[10px] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
          <div className="flex justify-between text-ios-footnote mb-1.5">
            <span>{message}</span>
            <span className="text-muted-foreground tabular-nums">{progress}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
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
