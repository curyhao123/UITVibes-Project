/**
 * useDoubleTap — fires a callback only on double-taps, ignoring singles.
 *
 * Uses Reanimated shared values so the timing check runs on the UI thread.
 *
 * @param callback  — called with the event on double-tap
 * @param delay     — max ms between two taps to count as a double (default 250ms)
 *
 * Usage:
 *   useDoubleTap(() => doSomething(), 250);
 */
import { useCallback, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';

interface UseDoubleTapOptions {
  onDoubleTap?: (event: any) => void;
  onSingleTap?: (event: any) => void;
  /**
   * Maximum ms between two taps to count as a double.
   * Instagram-style is 250–300ms. Default 250.
   */
  delay?: number;
}

export function useDoubleTap({
  onDoubleTap,
  onSingleTap,
  delay = 250,
}: UseDoubleTapOptions) {
  const lastTap = useSharedValue(0);

  const handleSingleTap = useCallback((_event: any) => {
    onSingleTap?.(_event);
  }, [onSingleTap]);

  const handleDoubleTap = useCallback((_event: any) => {
    onDoubleTap?.(_event);
  }, [onDoubleTap]);

  const tapGesture = Gesture.Tap()
    .maxDuration(delay * 2)
    .onEnd((event) => {
      'worklet';
      const now = Date.now();
      const prev = lastTap.value;

      if (prev > 0 && now - prev < delay) {
        // Double tap detected
        lastTap.value = 0;
        if (onDoubleTap) {
          runOnJS(handleDoubleTap)(event);
        }
      } else {
        // First tap — wait to see if a second comes
        lastTap.value = now;
        if (onSingleTap) {
          // Delay single-tap callback so it doesn't fire before double-tap window closes
          // We use a small JS-side timer to defer
          runOnJS(setTimeout)(() => {
            if (lastTap.value !== 0 && Date.now() - lastTap.value >= delay) {
              handleSingleTap(event);
              lastTap.value = 0;
            }
          }, delay + 20);
        }
      }
    });

  return { tapGesture };
}
