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
import { generateId } from '@/utils/id.ts';

export interface SolverInput {
  players: Player[];
  config: GameConfig;
  absentPlayerIds: string[];
  goalieAssignments: GoalieAssignment[];
  manualOverrides: ManualOverride[];
  startFromRotation?: number;
  existingRotations?: Rotation[];
}

export interface UseSolverReturn {
  solve: (input: SolverInput) => void;
  cancel: () => void;
  progress: number;
  message: string;
  isRunning: boolean;
  result: RotationSchedule | null;
  error: string | null;
  reset: () => void;
}

export function useSolver(): UseSolverReturn {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<RotationSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    workerRef.current = new Worker(
      new URL('../workers/rotation-solver.worker.ts', import.meta.url),
      { type: 'module' },
    );

    workerRef.current.onmessage = (e: MessageEvent<SolverResponse>) => {
      if (!isActive) return;
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
            setMessage('Complete');
            setResult(response.payload.schedule);
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

    return () => {
      isActive = false;
      workerRef.current?.terminate();
    };
  }, []);

  const solve = useCallback((input: SolverInput) => {
    if (!workerRef.current) return;
    const requestId = generateId();
    requestIdRef.current = requestId;
    setProgress(0);
    setMessage('Initializing...');
    setIsRunning(true);
    setResult(null);
    setError(null);

    const msg: SolverRequest = {
      type: 'SOLVE',
      payload: { requestId, ...input },
    };
    workerRef.current.postMessage(msg);
  }, []);

  const cancel = useCallback(() => {
    if (!workerRef.current || !requestIdRef.current) return;
    const msg: SolverRequest = {
      type: 'CANCEL',
      payload: { requestId: requestIdRef.current },
    };
    workerRef.current.postMessage(msg);
    setIsRunning(false);
    requestIdRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setMessage('');
    setResult(null);
    setError(null);
    setIsRunning(false);
  }, []);

  return { solve, cancel, progress, message, isRunning, result, error, reset };
}
