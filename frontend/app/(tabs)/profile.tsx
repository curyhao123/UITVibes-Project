import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { Avatar, PostGrid, Header, EmptyPostsState } from '../../components';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, posts, updateProfile, isNewUser } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const userPosts = posts.filter((post) => post.userId === 'current').slice(0, 9);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const openEditModal = () => {
    if (!currentUser) return;
    setEditDisplayName(currentUser.displayName);
    setEditBio(currentUser.bio);
    setEditWebsite(currentUser.website || '');
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editDisplayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty.');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: editDisplayName.trim(),
        bio: editBio.trim(),
        website: editWebsite.trim() || undefined,
      });
      setShowEditModal(false);
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareProfile = async () => {
    if (!currentUser) return;
    try {
      await Share.share({
        message: `Check out ${currentUser.displayName} on UITVibes! @${currentUser.username}`,
        title: `${currentUser.displayName} on UITVibes`,
      });
    } catch {
      // User cancelled
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={currentUser.username}
        showAvatar={false}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.settingsBtn}
            onPress={() => router.push('/settings' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="settings" size={22} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileInfo}>
          <Avatar user={currentUser} size="large" />
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/followers/current` as any)}>
              <Text style={styles.statNumber}>{formatCount(currentUser.posts)}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/followers/current` as any)}>
              <Text style={styles.statNumber}>{formatCount(currentUser.followers)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push('/followers/current?tab=following' as any)}
            >
              <Text style={styles.statNumber}>{formatCount(currentUser.following)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.nameSection}>
          <Text style={styles.displayName}>{currentUser.displayName}</Text>
          {currentUser.bio && <Text style={styles.bio}>{currentUser.bio}</Text>}
          {currentUser.website && (
            <Text style={styles.website}>{currentUser.website}</Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={openEditModal} activeOpacity={0.75}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile} activeOpacity={0.75}>
            <Feather name="share" size={15} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.highlights}>
          <View style={styles.highlightItem}>
            <View style={styles.highlightCircle}>
              <Feather name="plus" size={20} color={AppColors.text} strokeWidth={2} />
            </View>
            <Text style={styles.highlightText}>New Story</Text>
          </View>
        </View>

        {userPosts.length === 0 || isNewUser ? (
          <EmptyPostsState isNewUser={isNewUser} />
        ) : (
          <>
            <View style={styles.tabsContainer}>
              <View style={[styles.tab, styles.activeTab]}>
                <Feather name="grid" size={22} color={AppColors.primary} strokeWidth={2} />
              </View>
              <View style={styles.tab}>
                <Feather name="tag" size={22} color={AppColors.iconMuted} strokeWidth={2} />
              </View>
            </View>
            <PostGrid posts={userPosts} />
          </>
        )}
      </ScrollView>

      {/* ─── Edit Profile Modal ─────────────────────────────── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving || !editDisplayName.trim()}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={AppColors.primary} />
              ) : (
                <Text
                  style={[
                    styles.modalSave,
                    (!editDisplayName.trim() || isSaving) && styles.modalSaveDisabled,
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm}>
            <View style={styles.modalAvatarSection}>
              <Avatar user={currentUser} size="large" />
              <TouchableOpacity>
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Display Name</Text>
              <TextInput
                style={styles.formInput}
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                placeholder="Enter your display name"
                placeholderTextColor={AppColors.textMuted}
                maxLength={50}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Bio</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell us about yourself"
                placeholderTextColor={AppColors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Website</Text>
              <TextInput
                style={styles.formInput}
                value={editWebsite}
                onChangeText={setEditWebsite}
                placeholder="yourwebsite.com"
                placeholderTextColor={AppColors.textMuted}
                keyboardType="url"
                autoCapitalize="none"
                maxLength={100}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 20,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...Typography.statNumber,
    color: AppColors.text,
  },
  statLabel: {
    ...Typography.statLabel,
    color: AppColors.iconMuted,
    marginTop: 2,
  },
  nameSection: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 14,
  },
  displayName: {
    ...Typography.captionSemibold,
    color: AppColors.text,
    marginBottom: 2,
  },
  bio: {
    ...Typography.caption,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: 2,
  },
  website: {
    ...Typography.caption,
    color: AppColors.primary,
    textDecorationLine: 'underline',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: layoutPadding,
    marginBottom: 20,
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: AppColors.border,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    ...Typography.captionSemibold,
    color: AppColors.text,
  },
  shareButton: {
    width: 36,
    height: 36,
    backgroundColor: AppColors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlights: {
    flexDirection: 'row',
    paddingHorizontal: layoutPadding,
    marginBottom: 20,
  },
  highlightItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  highlightCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  highlightText: {
    ...Typography.meta,
    color: AppColors.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderTopWidth: 1,
    borderTopColor: AppColors.primary,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  modalCancel: {
    ...Typography.body,
    fontSize: 16,
    color: AppColors.text,
  },
  modalTitle: {
    ...Typography.sectionTitle,
    color: AppColors.text,
  },
  modalSave: {
    ...Typography.bodySemibold,
    fontSize: 16,
    color: AppColors.primary,
  },
  modalSaveDisabled: {
    color: AppColors.iconMuted,
  },
  modalForm: {
    flex: 1,
  },
  modalAvatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
    marginBottom: 8,
  },
  changePhotoText: {
    ...Typography.bodySemibold,
    color: AppColors.primary,
    marginTop: 10,
  },
  formGroup: {
    paddingHorizontal: layoutPadding,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  formLabel: {
    ...Typography.meta,
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.iconMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  formInput: {
    ...Typography.body,
    color: AppColors.text,
    padding: 0,
  },
  formInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
});
