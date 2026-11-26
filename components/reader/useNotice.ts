import { useEffect, useRef, useState } from "react";

// A short message above the play button that hides itself
export function useNotice() {
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef(0);

  function showNotice(message: string) {
    setNotice(message);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setNotice(null), 4500);
  }

  function clearNotice() {
    window.clearTimeout(timerRef.current);
    setNotice(null);
  }

  useEffect(() => {
    const timer = timerRef;
    return () => window.clearTimeout(timer.current);
  }, []);

  return { notice, showNotice, clearNotice };
}
