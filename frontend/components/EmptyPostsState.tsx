import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from './Button';
import { AppColors } from '../constants/theme';

interface EmptyPostsStateProps {
  isNewUser?: boolean;
}

export const EmptyPostsState: React.FC<EmptyPostsStateProps> = ({ isNewUser = false }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Camera icon with plus badge */}
      <View style={styles.iconWrapper}>
        <TouchableOpacity
          style={styles.cameraCircle}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/create')}
        >
          <Feather name="camera" size={32} color={AppColors.iconMuted} strokeWidth={1.5} />
        </TouchableOpacity>
        <View style={styles.plusBadge}>
          <Feather name="plus" size={12} color="#fff" strokeWidth={3} />
        </View>
      </View>

      {/* Text */}
      <Text style={styles.title}>Share Photos and Videos</Text>
      <Text style={styles.subtitle}>
        {isNewUser
          ? "When you share photos and videos, they'll appear on your profile."
          : 'Your posts will appear here.'}
      </Text>

      {/* CTA */}
      <Button
        title="Create your first post"
        onPress={() => router.push('/(tabs)/create')}
        size="md"
        style={styles.ctaBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconWrapper: {
    position: 'relative',
    width: 88,
    height: 88,
    marginBottom: 20,
  },
  cameraCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AppColors.borderLight,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: AppColors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.1,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  ctaBtn: {
    paddingHorizontal: 28,
  },
});
