import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '../constants/theme';

const TAB_BAR_HEIGHT = 72;
const SCOOP_GAP = 80; // gap width in the middle for the add button

export function TabBarBackground() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const half = width / 2;
  const sideWidth = half - SCOOP_GAP / 2;
  const totalHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      <View
        style={[
          styles.side,
          styles.left,
          {
            width: sideWidth,
            height: totalHeight,
          },
        ]}
      />
      <View
        style={[
          styles.side,
          styles.right,
          {
            left: half + SCOOP_GAP / 2,
            width: sideWidth,
            height: totalHeight,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  side: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: AppColors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  left: {
    left: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 0,
  },
  right: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 24,
  },
});
