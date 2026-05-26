/**
 * ReportUserSheet — Instagram/TikTok-style animated bottom sheet for reporting a user.
 *
 * Flow:
 *  1. Slide-up sheet with "Report User" header
 *  2. Radio-button list of report reasons (single selection)
 *  3. Optional free-text input for additional details
 *  4. "Submit Report" button — disabled until a reason is selected
 *  5. Loading spinner replaces button text while API request is in-flight
 *  6. Calls onReportSuccess({ userId, reason }) on success
 *
 * Design:
 * - Same animation pattern as UserActionsSheet (Animated.timing + Animated.spring)
 * - Custom radio-dot indicator for selected reason
 * - Keyboard-aware layout on iOS via KeyboardAvoidingView
 * - Legal disclaimer at the bottom
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors, borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import {
  REPORT_REASONS,
  ReportReason,
} from '../../services/backendTypes';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.82;

interface ReportUserSheetProps {
  visible: boolean;
  reportedDisplayName: string;
  reportedUserId: string;
  onClose: () => void;
  /** Called after report is successfully submitted. Parent handles toast. */
  onReportSuccess: (payload: { userId: string; reason: ReportReason }) => void;
}

export function ReportUserSheet({
  visible,
  reportedDisplayName,
  reportedUserId,
  onClose,
  onReportSuccess,
}: ReportUserSheetProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local state so animation out completes before React unmounts the Modal.
  const [isRendered, setIsRendered] = useState(false);

  // Animation refs — fresh instances each time so they re-init on re-mount
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  // Reset form state whenever the sheet is closed
  useEffect(() => {
    if (!visible) {
      setSelectedReason(null);
      setAdditionalDetails('');
      setIsSubmitting(false);
    }
  }, [visible]);

  // Mount animation
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 280,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Cleanup: if not visible but still rendered, animate out then unmount
  useEffect(() => {
    if (!visible && isRendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: SHEET_MAX_HEIGHT,
          damping: 30,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setIsRendered(false));
    }
  }, [visible, isRendered]);

  const handleClose = () => onClose();

  const handleSubmit = async () => {
    if (!selectedReason || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { reportUser } = await import('../../services/reportService');
      await reportUser(reportedUserId, selectedReason, additionalDetails);
      onClose();
      onReportSuccess({ userId: reportedUserId, reason: selectedReason });
    } catch (err) {
      console.error('[ReportUserSheet] submit error:', err);
      setIsSubmitting(false);
    }
  };

  // Don't render anything while closing animation finishes
  if (!isRendered) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Animated.View style={[styles.backdropFill, { opacity: backdropOpacity }]} />
      </Pressable>

      {/* Sheet — keyboard-aware on iOS */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: sheetOpacity,
              transform: [{ translateY: sheetTranslateY }],
              maxHeight: SHEET_MAX_HEIGHT,
            },
          ]}
        >
          {/* Swipe handle */}
          <View style={styles.swipeHandle} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={AppColors.textMuted} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Report User</Text>
            <View style={styles.closeBtn} />
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Why are you reporting{' '}
            <Text style={styles.nameHighlight}>{reportedDisplayName}</Text>?
          </Text>

          {/* Reasons list */}
          <View style={styles.reasonsContainer}>
            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                  activeOpacity={0.6}
                  onPress={() => setSelectedReason(reason)}
                >
                  <View style={styles.reasonLeft}>
                    <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
                      {reason}
                    </Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Additional details */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsLabel}>Additional details (optional)</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="Tell us more about what happened…"
              placeholderTextColor={AppColors.iconMuted}
              multiline
              maxLength={500}
              value={additionalDetails}
              onChangeText={setAdditionalDetails}
              textAlignVertical="top"
              scrollEnabled
            />
            <Text style={styles.charCount}>{additionalDetails.length}/500</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedReason || isSubmitting) && styles.submitBtnDisabled,
              ]}
              activeOpacity={0.75}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Report</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.legalNote}>
              Reports are reviewed by our moderation team. We do not notify the reported user.
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardAvoid: {
    justifyContent: 'flex-end',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.96)' : AppColors.surfaceElevated,
    paddingHorizontal: layoutPadding,
    paddingBottom: 34,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  swipeHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.border,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.sectionTitle,
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  nameHighlight: {
    fontWeight: '600',
    color: AppColors.text,
  },
  reasonsContainer: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: 16,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
  },
  reasonRowSelected: {
    backgroundColor: `${AppColors.primary}0A`,
  },
  reasonLeft: {
    flex: 1,
    marginRight: 12,
  },
  reasonLabel: {
    fontSize: 15,
    color: AppColors.text,
    fontWeight: '500',
  },
  reasonLabelSelected: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: AppColors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.primary,
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsInput: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: AppColors.text,
    minHeight: 90,
    maxHeight: 150,
  },
  charCount: {
    fontSize: 11,
    color: AppColors.iconMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  submitBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  submitBtnDisabled: {
    backgroundColor: AppColors.border,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  legalNote: {
    fontSize: 11,
    color: AppColors.iconMuted,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 10,
    paddingHorizontal: 8,
  },
});
