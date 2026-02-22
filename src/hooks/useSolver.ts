import { useEffect, useRef, useState, useCallback } from 'react';
import type { SolverRequest, SolverResponse } from '@/types/solver.ts';
import type {
  Player,
  GameConfig,
  GoalieAssignment,
  ManualOverride,
  Rotation,
  RotationSchedule,
} from '@/types/domain.ts';
import type { OptimizationSuggestion } from '@/utils/divisionOptimizer.ts';
import { generateId } from '@/utils/id.ts';

export interface SolverInput {
  players: Player[];
  config: GameConfig;
  absentPlayerIds: string[];
  goalieAssignments: GoalieAssignment[];
  manualOverrides: ManualOverride[];
  periodDivisions?: number[];
  startFromRotation?: number;
  existingRotations?: Rotation[];
  allowConstraintRelaxation?: boolean;
  skipOptimizationCheck?: boolean;
}

export interface UseSolverReturn {
  solve: (input: SolverInput) => void;
  cancel: () => void;
  progress: number;
  message: string;
  isRunning: boolean;
  result: RotationSchedule | null;
  suggestion: OptimizationSuggestion | null;
  error: string | null;
  setError: (error: string) => void;
  reset: () => void;
}

export function useSolver(): UseSolverReturn {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<RotationSchedule | null>(null);
  const [suggestion, setSuggestion] = useState<OptimizationSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setupWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(new URL('../workers/rotation-solver.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e: MessageEvent<SolverResponse>) => {
      if (!isMountedRef.current) return;
      const response = e.data;
      switch (response.type) {
        case 'PROGRESS':
          if (response.payload.requestId === requestIdRef.current) {
            setProgress(response.payload.percentage);
            setMessage(response.payload.message);
          }
          break;
        case 'SUCCESS':
          if (response.payload.requestId === requestIdRef.current) {
            setProgress(100);
            setMessage('game:solver.complete');
            setResult(response.payload.schedule);
            setSuggestion(response.payload.optimizationSuggestion ?? null);
            setIsRunning(false);
            requestIdRef.current = null;
          }
          break;
        case 'ERROR':
          if (response.payload.requestId === requestIdRef.current) {
            setError(response.payload.error);
            setIsRunning(false);
            requestIdRef.current = null;
          }
          break;
      }
    };

    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setupWorker();

    return () => {
      isMountedRef.current = false;
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [setupWorker]);

  const solve = useCallback(
    (input: SolverInput) => {
      const worker = setupWorker();
      const requestId = generateId();
      requestIdRef.current = requestId;
      setProgress(0);
      setMessage('game:solver.initializing');
      setIsRunning(true);
      setResult(null);
      setSuggestion(null);
      setError(null);

      const msg: SolverRequest = {
        type: 'SOLVE',
        payload: { requestId, ...input },
      };
      worker.postMessage(msg);
    },
    [setupWorker],
  );

  const cancel = useCallback(() => {
    if (!workerRef.current || !requestIdRef.current) return;

    // Terminate immediately so long-running synchronous worker searches stop at once.
    workerRef.current.terminate();
    workerRef.current = null;
    requestIdRef.current = null;
    setIsRunning(false);
    setMessage('');
    setProgress(0);
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setMessage('');
    setResult(null);
    setSuggestion(null);
    setError(null);
    setIsRunning(false);
  }, []);

  return {
    solve,
    cancel,
    progress,
    message,
    isRunning,
    result,
    suggestion,
    error,
    setError,
    reset,
  };
}
