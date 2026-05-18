/**
 * OTPInput — reusable 6-digit OTP entry component.
 *
 * Features:
 * - 6 individual TextInput boxes, each accepting 1 digit
 * - Auto-focus next box on digit entry
 * - Backspace moves to previous box
 * - Paste support (pastes all digits at once)
 * - Auto-focus first empty box on mount
 * - Configurable length (default 6)
 * - KeyboardType: number-pad
 * - Animated focus indicator
 * - Accessible with proper labels
 *
 * Usage:
 *   const [otp, setOtp] = useState(['', '', '', '', '', '']);
 *   <OTPInput
 *     value={otp}
 *     onChange={setOtp}
 *     autoFocus
 *   />
 */
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { AppColors, borderRadius } from "../constants/theme";
import { Typography } from "../constants/typography";

export interface OTPInputRef {
  focus: () => void;
  clear: () => void;
}

interface OTPInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  length?: number;
  autoFocus?: boolean;
  editable?: boolean;
  testID?: string;
}

const DIGIT_BOX_SIZE = 48;
const DIGIT_BOX_GAP = 10;

const OTPInput = forwardRef<OTPInputRef, OTPInputProps>(
  (
    {
      value,
      onChange,
      length = 6,
      autoFocus = true,
      editable = true,
      testID,
    },
    ref,
  ) => {
    const inputRefs = useRef<(TextInput | null)[]>([]);

    // Focus animation for the active box
    const focusOpacity = useSharedValue(autoFocus ? 1 : 0);

    // ── Expose focus() and clear() via ref ──────────────────────────────────
    useImperativeHandle(ref, () => ({
      focus: () => {
        const firstEmptyIndex = value.findIndex((d) => d === "");
        const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;
        inputRefs.current[targetIndex]?.focus();
      },
      clear: () => {
        onChange(Array(length).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      },
    }));

    // ── Auto-focus first empty box on mount ─────────────────────────────────
    useEffect(() => {
      if (autoFocus) {
        const firstEmptyIndex = value.findIndex((d) => d === "");
        const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
        setTimeout(() => inputRefs.current[targetIndex]?.focus(), 150);
      }
    }, [autoFocus]);

    // ── Handle single digit entry ───────────────────────────────────────────
    const handleChange = (index: number, val: string) => {
      const raw = val.replace(/\D/g, "");
      const digit = raw.slice(-1); // take only the last character

      const newOtp = [...value];
      newOtp[index] = digit;
      onChange(newOtp);

      if (digit !== "") {
        // Auto-advance to next box
        if (index < length - 1) {
          inputRefs.current[index + 1]?.focus();
        }
      }
    };

    // ── Handle key press (Backspace) ────────────────────────────────────────
    const handleKeyPress = (
      index: number,
      e: { nativeEvent: { key: string } },
    ) => {
      if (e.nativeEvent.key === "Backspace") {
        if (value[index] === "" && index > 0) {
          // Move to previous box and clear it
          inputRefs.current[index - 1]?.focus();
          const newOtp = [...value];
          newOtp[index - 1] = "";
          onChange(newOtp);
        } else if (value[index] !== "") {
          // Clear current box
          const newOtp = [...value];
          newOtp[index] = "";
          onChange(newOtp);
        }
      }
    };

    // ── Handle focus / blur for animation ───────────────────────────────────
    const handleFocus = (index: number) => {
      focusOpacity.value = withTiming(1, { duration: 150 });
      // Clear the box when focusing (better UX for re-entry)
      if (value[index] !== "") {
        const newOtp = [...value];
        newOtp[index] = "";
        onChange(newOtp);
      }
    };

    // ── Paste handler — fill all boxes from clipboard ────────────────────────
    const handlePaste = (pasted: string) => {
      const digits = pasted.replace(/\D/g, "").slice(0, length).split("");
      const newOtp = Array(length).fill("");
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      onChange(newOtp);
      // Focus the last filled box or the first empty
      const lastFilledIndex = Math.min(digits.length, length - 1);
      inputRefs.current[lastFilledIndex]?.focus();
    };

    // ── Container tap: focus first empty box ────────────────────────────────
    const handleContainerPress = () => {
      const firstEmptyIndex = value.findIndex((d) => d === "");
      const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;
      inputRefs.current[targetIndex]?.focus();
    };

    const animatedFocusStyle = useAnimatedStyle(() => ({
      opacity: focusOpacity.value,
    }));

    return (
      <View
        style={styles.container}
        onTouchEnd={handleContainerPress}
        testID={testID}
      >
        {Array.from({ length }, (_, index) => (
          <View key={index} style={styles.digitWrap}>
            <TextInput
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              style={[
                styles.digitBox,
                value[index]?.length > 0 && styles.digitBoxFilled,
                !editable && styles.digitBoxDisabled,
              ]}
              value={value[index]}
              onChangeText={(val) => handleChange(index, val)}
              onKeyPress={(e) => handleKeyPress(index, e)}
              onFocus={() => handleFocus(index)}
              onSelectionChange={(e) => {
                // Support paste: if user long-pastes, detect it
                const { selection, text } = e.nativeEvent;
                if (
                  text &&
                  text.length > 1 &&
                  selection.start === 0 &&
                  selection.end === text.length
                ) {
                  handlePaste(text);
                }
              }}
              keyboardType="number-pad"
              maxLength={length}
              numericButtons={["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]}
              selectTextOnFocus
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
              editable={editable}
              returnKeyType={index === length - 1 ? "done" : "next"}
              blurOnSubmit={false}
              importantForAutofill="no"
              accessibilityLabel={`OTP digit ${index + 1}`}
              accessibilityHint={`Enter digit ${index + 1} of ${length}`}
            />

            {/* Animated focus underline indicator */}
            <Animated.View
              style={[
                styles.focusLine,
                animatedFocusStyle,
                { display: inputRefs.current[index]?.isFocused() ? "flex" : "none" },
              ]}
              pointerEvents="none"
            />
          </View>
        ))}
      </View>
    );
  },
);

OTPInput.displayName = "OTPInput";

export default OTPInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: DIGIT_BOX_GAP,
  },
  digitWrap: {
    position: "relative",
    alignItems: "center",
  },
  digitBox: {
    width: DIGIT_BOX_SIZE,
    height: DIGIT_BOX_SIZE,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.text,
    letterSpacing: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#2D3748",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  digitBoxFilled: {
    borderColor: AppColors.primary,
    backgroundColor: `${AppColors.primary}08`,
  },
  digitBoxDisabled: {
    opacity: 0.5,
  },
  focusLine: {
    position: "absolute",
    bottom: -2,
    width: DIGIT_BOX_SIZE * 0.6,
    height: 2,
    borderRadius: 1,
    backgroundColor: AppColors.primary,
  },
});
