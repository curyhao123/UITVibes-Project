import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { Typography } from '../../constants/typography';

type IconName = React.ComponentProps<typeof Feather>['name'];

export type SettingsRowVariant = 'default' | 'toggle' | 'danger';

interface SettingsRowProps {
  /** Feather icon name (left side) */
  icon?: IconName;
  /** Primary label */
  label: string;
  /** Optional secondary description shown below label */
  subtitle?: string;
  /** Right-side text value (e.g. "Public", "English") */
  value?: string;
  /** Whether to show the chevron arrow */
  showChevron?: boolean;
  /** Whether this row is a toggle switch */
  isToggle?: boolean;
  /** Current toggle value */
  toggleValue?: boolean;
  /** Toggle change handler */
  onToggle?: (val: boolean) => void;
  /** Press handler (ignored when isToggle is true) */
  onPress?: () => void;
  /** Row variant for visual styling */
  variant?: SettingsRowVariant;
  /** Whether this is the first item in a group */
  isFirst?: boolean;
  /** Whether this is the last item in a group */
  isLast?: boolean;
  /** Icon background color override */
  iconBg?: string;
  /** Icon color override */
  iconColor?: string;
}

/**
 * Premium settings row component.
 *
 * WHY this design:
 * - Supports multiple layouts: link row, toggle row, value row
 * - Consistent 60px row height for modern mobile feel
 * - Icon container uses soft tinted background (not raw icon)
 * - Subtle separator lines only on non-last rows
 * - Proper touch targets (full row is tappable)
 * - Icon + label left-aligned, value/chevron/toggle right-aligned
 */
export const SettingsRow = memo(function SettingsRow({
  icon,
  label,
  subtitle,
  value,
  showChevron = true,
  isToggle = false,
  toggleValue = false,
  onToggle,
  onPress,
  variant = 'default',
  isFirst = false,
  isLast = false,
  iconBg,
  iconColor,
}: SettingsRowProps) {
  const handlePress = useCallback(() => {
    if (!isToggle && onPress) {
      onPress();
    }
  }, [isToggle, onPress]);

  const isInteractive = !isToggle && onPress !== undefined;

  // Determine text color based on variant
  const labelColor =
    variant === 'danger' ? AppColors.error : AppColors.text;
  const subtitleColor = AppColors.textMuted;
  const iconBgColor =
    iconBg ??
    (variant === 'danger'
      ? `${AppColors.error}15`
      : `${AppColors.primary}12`);
  const iconFgColor = iconColor ?? (variant === 'danger' ? AppColors.error : AppColors.primary);

  const content = (
    <>
      {/* Left: Icon */}
      {icon && (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: iconBgColor },
          ]}
        >
          <Feather name={icon} size={18} color={iconFgColor} />
        </View>
      )}

      {/* Center: Label + Subtitle */}
      <View style={styles.labelWrap}>
        <Text
          style={[styles.label, { color: labelColor }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: subtitleColor }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right: Value / Toggle / Chevron */}
      <View style={styles.rightWrap}>
        {isToggle && onToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{
              false: AppColors.border,
              true: `${AppColors.primary}60`,
            }}
            thumbColor={
              toggleValue ? AppColors.primary : AppColors.surfaceElevated
            }
            ios_backgroundColor={AppColors.border}
          />
        ) : (
          <>
            {value && (
              <Text style={styles.valueText} numberOfLines={1}>
                {value}
              </Text>
            )}
            {showChevron && !isToggle && (
              <Feather
                name="chevron-right"
                size={18}
                color={AppColors.iconMuted}
                style={styles.chevron}
              />
            )}
          </>
        )}
      </View>
    </>
  );

  if (isToggle) {
    return (
      <View
        style={[
          styles.row,
          !isLast && styles.rowBorderBottom,
          isFirst && styles.rowFirst,
          isLast && styles.rowLast,
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.row,
        !isLast && styles.rowBorderBottom,
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
      ]}
      onPress={handlePress}
      disabled={!isInteractive}
      activeOpacity={isInteractive ? 0.6 : 1}
    >
      {content}
    </TouchableOpacity>
  );
});

const ROW_HEIGHT = 60;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.surfaceElevated,
  },
  rowBorderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
  },
  rowFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  rowLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  labelWrap: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  label: {
    ...Typography.body,
    fontWeight: '500',
    lineHeight: 20,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
    lineHeight: 18,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  valueText: {
    ...Typography.body,
    color: AppColors.textMuted,
    maxWidth: 120,
  },
  chevron: {
    marginLeft: 2,
  },
});
