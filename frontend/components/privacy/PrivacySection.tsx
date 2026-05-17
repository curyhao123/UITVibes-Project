import React, { memo, useCallback, useState } from 'react';
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
import { AppColors, borderRadius } from '../../constants/theme';
import { Typography } from '../../constants/typography';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface PrivacySectionData {
  id: string;
  title: string;
  bullets?: string[];
  content?: string;
}

interface PrivacySectionProps {
  item: PrivacySectionData;
  isFirst?: boolean;
  isLast?: boolean;
}

const layoutAnimationConfig = {
  duration: 260,
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
 * Animated accordion section for Privacy Policy content.
 *
 * Design rationale:
 * - Bullet list layout for scannable, digestible content
 * - Smooth expand/collapse via LayoutAnimation (UI thread, zero JS cost)
 * - Title bold + chevron right — users scan and tap what interests them
 * - Top/bottom rounded corners only on first/last item for card grouping
 * - Divider separates title from content for clean visual hierarchy
 * - Reuses feather icons from the design system
 */
export const PrivacySection = memo(function PrivacySection({
  item,
  isFirst,
  isLast,
}: PrivacySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

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
          color={AppColors.iconMuted}
          strokeWidth={2.5}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.contentWrap}>
          <View style={styles.contentDivider} />
          {item.content && <Text style={styles.content}>{item.content}</Text>}
          {item.bullets && item.bullets.length > 0 && (
            <View style={styles.bulletsWrap}>
              {item.bullets.map((bullet, index) => (
                <View key={index} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.surface,
    overflow: 'hidden',
  },
  containerFirst: {
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.borderLight,
  },
  containerLast: {
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
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
    color: AppColors.text,
    flex: 1,
  },
  contentWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contentDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.borderLight,
    marginBottom: 14,
  },
  content: {
    ...Typography.body,
    color: AppColors.textSecondary,
    lineHeight: 23,
  },
  bulletsWrap: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: AppColors.primary,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    ...Typography.body,
    color: AppColors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
});
