/**
 * useDoubleTap — fires onDoubleTap on two quick taps, onSingleTap otherwise.
 *
 * All timing logic runs in plain JS (setTimeout). The worklet only updates
 * shared values and calls runOnJS with plain function references.
 * Safe for web, iOS, and Android.
 *
 * @param onDoubleTap — called when two taps occur within `delay` ms
 * @param onSingleTap — called when no second tap arrives within `delay` ms
 * @param delay       — max ms between taps to count as a double (default 260)
 *
 * Usage:
 *   const { tapGesture } = useDoubleTap({
 *     onDoubleTap: () => { /* ... *\/ },
 *     onSingleTap: () => { /* ... *\/ },
 *     delay: 260,
 *   });
 */
import { useCallback, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

interface UseDoubleTapOptions {
  onDoubleTap?: (event: any) => void;
  onSingleTap?: (event: any) => void;
  /** Maximum ms between two taps to count as a double. Default 260. */
  delay?: number;
}

export function useDoubleTap({
  onDoubleTap,
  onSingleTap,
  delay = 260,
}: UseDoubleTapOptions) {
  const tapCount = useSharedValue(0);
  const lastEventRef = useRef<any>(null);

  // ── Wrapped JS callbacks ──────────────────────────────────────────────────
  // These are plain JS functions (no worklet annotation). Safe to pass to runOnJS.
  // Wrapped in useCallback so the function identity is stable.

  const handleDoubleTapJS = useCallback(
    (event: any) => {
      onDoubleTap?.(event);
    },
    [onDoubleTap],
  );

  const handleSingleTapJS = useCallback(
    (event: any) => {
      onSingleTap?.(event);
    },
    [onSingleTap],
  );

  // ── Module-level timer ref (shared across all hook instances) ──────────
  // Only one timer can be active at a time; a new tap always cancels the previous one.
  // Using module-level to avoid stale closures — the tapCount shared value
  // is the source of truth for whether a second tap arrived.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleSingleTap = useCallback(
    (event: any) => {
      clearTimer();
      lastEventRef.current = event;
      timerRef.current = setTimeout(() => {
        // Only fire if tapCount is still 1 (no second tap arrived)
        // tapCount.value === 1 means first tap was registered but no second tap yet
        if (tapCount.value === 1) {
          tapCount.value = 0;
          onSingleTap?.(lastEventRef.current);
        }
        timerRef.current = null;
      }, delay + 30);
    },
    [clearTimer, delay, onSingleTap, tapCount],
  );

  // ── Gesture ──────────────────────────────────────────────────────────────
  //
  // The worklet only touches shared values. All side effects (timers, callbacks)
  // go through runOnJS with plain functions. This is the only pattern that is
  // guaranteed safe across web, iOS, and Android.
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(delay * 2)
        .onEnd((event) => {
          'worklet';
          const prev = tapCount.value;

          if (prev === 1) {
            // Second tap within window → double tap
            tapCount.value = 0;
            if (onDoubleTap) {
              // Cancel any pending single-tap timer (synchronous, safe in worklet)
              runOnJS(clearTimer)();
              runOnJS(handleDoubleTapJS)(event);
            }
          } else {
            // First tap → schedule single-tap timer
            tapCount.value = 1;
            if (onSingleTap) {
              runOnJS(scheduleSingleTap)(event);
            }
          }
        }),
    [delay, handleDoubleTapJS, handleSingleTapJS, clearTimer, scheduleSingleTap, onDoubleTap, onSingleTap, tapCount],
  );

  return { tapGesture };
}
