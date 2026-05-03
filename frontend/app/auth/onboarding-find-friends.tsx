import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { AppColors, borderRadius } from '../../constants/theme';
import { User } from '../../data/mockData';
import * as api from '../../services/api';

interface SuggestedUserItemProps {
  user: User;
  onFollow: (userId: string) => void;
  onDismiss: (userId: string) => void;
}

const SuggestedUserItem: React.FC<SuggestedUserItemProps> = ({ user, onFollow, onDismiss }) => {
  const [followed, setFollowed] = useState(false);

  const handleFollow = () => {
    setFollowed(true);
    onFollow(user.id);
  };

  return (
    <View style={styles.userCard}>
      <Avatar user={user} size="medium" />
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.displayName}
        </Text>
        <Text style={styles.userHandle} numberOfLines={1}>
          @{user.username}
        </Text>
        {user.isVerified && (
          <Feather name="check-circle" size={12} color={AppColors.primary} />
        )}
      </View>
      <View style={styles.userActions}>
        {followed ? (
          <View style={styles.followedBadge}>
            <Feather name="check" size={12} color={AppColors.success} />
            <Text style={styles.followedText}>Following</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.followBtn}
              onPress={handleFollow}
              activeOpacity={0.75}
            >
              <Text style={styles.followBtnText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => onDismiss(user.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color={AppColors.iconMuted} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

export default function OnboardingFindFriendsScreen() {
  const router = useRouter();
  const { onboardingData, fetchSuggestedUsers, suggestedUsers, followSuggestedUser, completeOnboardingStep } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [localSuggested, setLocalSuggested] = useState<User[]>([]);

  // Progress indicator (4 steps: fullName, displayName, avatar/bio, find friends)
  const [step1Active, step2Active, step3Active, step4Active] = [false, false, false, true];

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  useEffect(() => {
    setLocalSuggested(suggestedUsers);
  }, [suggestedUsers]);

  const handleFollow = (userId: string) => {
    followSuggestedUser(userId);
    setLocalSuggested((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleDismiss = (userId: string) => {
    setLocalSuggested((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleFindFriends = async () => {
    setIsLoading(true);
    try {
      // Batch-save all collected onboarding data to DB in one call
      console.log("[Onboarding] Saving profile:", {
        fullName: onboardingData.fullName,
        displayName: onboardingData.displayName,
        gender: onboardingData.gender,
        bio: onboardingData.bio,
      });
      await api.updateProfile({
        fullName: onboardingData.fullName || undefined,
        displayName: onboardingData.displayName || undefined,
        gender: onboardingData.gender || undefined,
        bio: onboardingData.bio || undefined,
      });
      console.log("[Onboarding] Profile saved successfully.");
    } catch (err: any) {
      console.error("[Onboarding] Failed to save profile:", err?.response?.data ?? err);
    } finally {
      completeOnboardingStep();
      setIsLoading(false);
      router.replace('/(tabs)/home');
    }
  };

  const handleSkip = async () => {
    completeOnboardingStep();
    router.replace('/(tabs)/home');
  };

  const handleSyncContacts = () => {
    // Placeholder for contacts sync
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={AppColors.text} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress indicator */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, step1Active && styles.progressDotActive]} />
        <View style={[styles.progressDot, step2Active && styles.progressDotActive]} />
        <View style={[styles.progressDot, step3Active && styles.progressDotActive]} />
        <View style={[styles.progressDot, step4Active && styles.progressDotActive]} />
      </View>

      <FlatList
        data={localSuggested}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Welcome */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeEmoji}>👋</Text>
              <Text style={styles.welcomeTitle}>
                Welcome{onboardingData.displayName ? `, ${onboardingData.displayName}` : ''}!
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Find your friends and start vibing together.
              </Text>
            </View>

            {/* CTAs */}
            <View style={styles.ctaSection}>
              <TouchableOpacity
                style={styles.syncContactsBtn}
                onPress={handleSyncContacts}
                activeOpacity={0.75}
              >
                <View style={styles.syncIconWrap}>
                  <Feather name="users" size={20} color={AppColors.primary} strokeWidth={2} />
                </View>
                <View style={styles.syncTextWrap}>
                  <Text style={styles.syncTitle}>Find Friends</Text>
                  <Text style={styles.syncSubtitle}>Discover people you may know</Text>
                </View>
                <Feather name="chevron-right" size={18} color={AppColors.iconMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.syncContactsBtn}
                onPress={handleSyncContacts}
                activeOpacity={0.75}
              >
                <View style={styles.syncIconWrap}>
                  <Feather name="smartphone" size={20} color={AppColors.primary} strokeWidth={2} />
                </View>
                <View style={styles.syncTextWrap}>
                  <Text style={styles.syncTitle}>Sync Contacts</Text>
                  <Text style={styles.syncSubtitle}>Connect with friends from your contacts</Text>
                </View>
                <Feather name="chevron-right" size={18} color={AppColors.iconMuted} />
              </TouchableOpacity>
            </View>

            {/* Suggested section title */}
            {localSuggested.length > 0 && (
              <View style={styles.suggestedHeader}>
                <Text style={styles.suggestedTitle}>Suggested for you</Text>
                <Text style={styles.suggestedSubtitle}>
                  People with similar vibes to follow
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <SuggestedUserItem
            user={item}
            onFollow={handleFollow}
            onDismiss={handleDismiss}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Feather name="user-check" size={32} color={AppColors.iconMuted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>You're all set!</Text>
            <Text style={styles.emptySubtitle}>
              You've followed everyone we suggested. Check back later for more.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.footerActions}>
            <Button
              title={localSuggested.length === 0 ? "Let's Go!" : 'Continue'}
              onPress={handleFindFriends}
              loading={isLoading}
              size="lg"
            />
            {localSuggested.length > 0 && (
              <TouchableOpacity
                style={styles.seeMoreBtn}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.seeMoreText}>I'll do this later</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
    letterSpacing: -0.1,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.border,
  },
  progressDotActive: {
    backgroundColor: AppColors.primary,
    width: 24,
  },
  listContent: {
    paddingBottom: 32,
  },
  listHeader: {
    paddingHorizontal: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  welcomeEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 6,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.1,
    paddingHorizontal: 16,
  },
  ctaSection: {
    gap: 12,
    marginBottom: 28,
  },
  syncContactsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  syncIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FDF0EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  syncTextWrap: {
    flex: 1,
  },
  syncTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  syncSubtitle: {
    fontSize: 13,
    color: AppColors.textMuted,
    letterSpacing: -0.05,
  },
  suggestedHeader: {
    marginBottom: 16,
  },
  suggestedTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  suggestedSubtitle: {
    fontSize: 14,
    color: AppColors.textMuted,
    letterSpacing: -0.1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: AppColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: -0.1,
  },
  userHandle: {
    fontSize: 13,
    color: AppColors.textMuted,
    letterSpacing: -0.05,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.1,
  },
  dismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  followedText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.success,
    letterSpacing: -0.1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerActions: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
  },
  seeMoreBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  seeMoreText: {
    fontSize: 15,
    color: AppColors.textMuted,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
