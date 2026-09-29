import { DestroyRef, Signal, inject, signal } from '@angular/core';

export interface RetryCountdown {
  seconds: Signal<number>;
  start(initialSeconds: number): void;
}

/**
 * Ticks a `Retry-After` duration down to zero once a second, for RATE_LIMITED's submit-disable
 * countdown -- the signals equivalent of the React client's `useRetryCountdown`. Must be called
 * from an injection context (a component's field initializer or constructor) so `DestroyRef` can
 * clear the interval on destroy.
 */
export function createRetryCountdown(): RetryCountdown {
  const destroyRef = inject(DestroyRef);
  const seconds = signal(0);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function clear(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  destroyRef.onDestroy(clear);

  function start(initialSeconds: number): void {
    clear();
    seconds.set(initialSeconds);
    if (initialSeconds <= 0) return;
    intervalId = setInterval(() => {
      seconds.update((current) => {
        if (current <= 1) {
          clear();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  return { seconds: seconds.asReadonly(), start };
}
