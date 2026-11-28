import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borderRadius, type ThemeColors } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface TermsSectionData {
  id: string;
  title: string;
  content: string;
}

interface TermsSectionProps {
  item: TermsSectionData;
  isFirst?: boolean;
  isLast?: boolean;
}

const layoutAnimationConfig = {
  duration: 280,
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

/**
 * Animated accordion section for legal/terms content.
 *
 * Design rationale:
 * - Section title is bold and prominent — user should scan and tap what interests them
 * - Content fades in with LayoutAnimation (UI thread, no JS re-render cost)
 * - Divider separates title from body for clean visual hierarchy
 * - Chevron rotates on expand/collapse (chevron-up / chevron-down)
 * - Consistent border-radius corners: top for first item, bottom for last item
 */
export const TermsSection = memo(function TermsSection(
  { item, isFirst, isLast }: TermsSectionProps,
) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePress = useCallback(() => {
    LayoutAnimation.configureNext(layoutAnimationConfig);
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <View
      style={[
        styles.container,
        isFirst && styles.containerFirst,
        isLast && styles.containerLast,
      ]}
    >
      <TouchableOpacity
        style={styles.trigger}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <Text style={styles.title}>{item.title}</Text>
        <Feather
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.iconMuted}
          strokeWidth={2.5}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.contentWrap}>
          <View style={styles.contentDivider} />
          <Text style={styles.content}>{item.content}</Text>
        </View>
      )}
    </View>
  );
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  containerFirst: {
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  containerLast: {
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    marginBottom: 0,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  title: {
    ...Typography.bodySemibold,
    color: colors.text,
    flex: 1,
  },
  contentWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contentDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginBottom: 14,
  },
  content: {
    ...Typography.body,
    color: colors.textSecondary,
    lineHeight: 23,
  },
});
