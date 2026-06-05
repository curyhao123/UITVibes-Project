/**
 * BannedAccountModal — displayed when a user tries to log in to a banned account.
 *
 * Features:
 * - Modal popup with animated entry
 * - Clear messaging about the ban
 * - Single action button to dismiss
 *
 * Props:
 *   visible: boolean — controls modal visibility
 *   onClose: () => void — called when user dismisses the modal
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { AppColors, borderRadius } from "../constants/theme";
import { Button } from "./Button";

interface BannedAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BannedAccountModal({
  visible,
  onClose,
}: BannedAccountModalProps) {
  const [modalScale] = useState(new Animated.Value(0.8));
  const [modalOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(modalScale, {
          toValue: 0.8,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, modalOpacity, modalScale]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.card,
              { opacity: modalOpacity, transform: [{ scale: modalScale }] },
            ]}
          >
          {/* Warning icon */}
          <View style={styles.iconWrap}>
            <Feather
              name="alert-octagon"
              size={36}
              color="#DC2626"
              strokeWidth={1.5}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Account Banned</Text>

          {/* Message */}
          <Text style={styles.message}>
            Your account has been suspended due to a violation of our community
            guidelines. If you believe this is a mistake, please contact our
            support team for assistance.
          </Text>

          <Button
            title="Understood"
            onPress={onClose}
            size="lg"
            style={styles.button}
          />
        </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.xl,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.text,
    marginBottom: 12,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: AppColors.textMuted,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    width: "100%",
  },
});
