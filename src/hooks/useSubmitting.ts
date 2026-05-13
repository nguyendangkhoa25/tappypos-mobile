import { useCallback, useRef, useState } from 'react';

export function useSubmitting() {
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);

  const withSubmit = useCallback(async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setSubmitting(true);
    try {
      await fn();
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }, []);

  return [submitting, withSubmit] as const;
}
