import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, layoutPadding, type ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { ContentVisibility } from '../services/contentPreferences';

export const VISIBILITY_OPTIONS: {
  value: ContentVisibility;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  description: string;
}[] = [
  { value: 'Public', label: 'Public', icon: 'globe', description: 'Anyone can see your post' },
  { value: 'Followers', label: 'Followers', icon: 'users', description: 'Only followers can see' },
  { value: 'Private', label: 'Private', icon: 'lock', description: 'Only mentioned users can see' },
];

interface VisibilityPickerSheetProps {
  visible: boolean;
  current: ContentVisibility;
  isSaving?: boolean;
  onSelect: (visibility: ContentVisibility) => void;
  onClose: () => void;
}

export const VisibilityPickerSheet: React.FC<VisibilityPickerSheetProps> = ({
  visible,
  current,
  isSaving = false,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Who can see this post?</Text>

          {VISIBILITY_OPTIONS.map((option) => {
            const selected = option.value === current;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => onSelect(option.value)}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                  <Feather
                    name={option.icon}
                    size={18}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                {selected &&
                  (isSaving ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Feather name="check" size={20} color={colors.primary} />
                  ))}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surfaceElevated,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: layoutPadding,
      paddingTop: 10,
      paddingBottom: 36,
      gap: 8,
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}14`,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.borderLight,
    },
    iconWrapSelected: {
      backgroundColor: `${colors.primary}26`,
    },
    optionText: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    optionDescription: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
