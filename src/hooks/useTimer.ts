import { useState, useEffect, useCallback, useRef } from "react";

export function useTimer(
  durationSeconds: number,
  onExpire: () => void
): {
  secondsLeft: number;
  reset: () => void;
  pause: () => void;
  isRunning: boolean;
} {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const reset = useCallback(() => {
    setSecondsLeft(durationSeconds);
    setIsRunning(true);
  }, [durationSeconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  return { secondsLeft, reset, pause, isRunning };
}
