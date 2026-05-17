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
import { AppColors, borderRadius } from '../../constants/theme';
import { Typography } from '../../constants/typography';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface FAQItemData {
  id: string;
  question: string;
  answer: string;
}

interface FAQItemProps {
  item: FAQItemData;
  isFirst?: boolean;
  isLast?: boolean;
}

const layoutAnimationConfig = {
  duration: 250,
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
 * Animated accordion FAQ item.
 *
 * Uses LayoutAnimation for smooth expand/collapse on both iOS and Android.
 * Performance note: LayoutAnimation runs on the UI thread — no JS re-renders.
 */
export const FAQItem = memo(function FAQItem(
  { item, isFirst, isLast }: FAQItemProps,
) {
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
        <Text style={styles.question}>{item.question}</Text>
        <Feather
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={AppColors.iconMuted}
          strokeWidth={2}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.answerWrap}>
          <View style={styles.answerDivider} />
          <Text style={styles.answer}>{item.answer}</Text>
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
    marginBottom: 4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  question: {
    ...Typography.bodyMedium,
    color: AppColors.text,
    flex: 1,
  },
  answerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  answerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.borderLight,
    marginBottom: 12,
  },
  answer: {
    ...Typography.body,
    color: AppColors.textSecondary,
    lineHeight: 22,
  },
});
