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
import { Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../context/AppContext';
import { Avatar, PostGrid, Header, EmptyPostsState } from '../../components';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import defaultAvatar from '../../assets/images/default-avatar.png';

/** Snapshot khi mở Edit Profile — Cancel/đóng modal khôi phục về đây, chỉ Save mới gọi API */
type EditFormSnapshot = {
  displayName: string;
  bio: string;
  website: string;
  avatar: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, posts, updateProfile, updateAvatar, deleteAvatar, isNewUser } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<EditFormSnapshot | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  /** Ảnh đã chọn trong modal, chưa upload — chỉ gửi khi Save */
  const [avatarDraftUri, setAvatarDraftUri] = useState<string | null>(null);
  /** User bấm Remove trong modal — chỉ xóa trên server khi Save */
  const [avatarDraftRemoved, setAvatarDraftRemoved] = useState(false);
  const [removePhotoConfirmVisible, setRemovePhotoConfirmVisible] = useState(false);

  const userPosts = posts.filter((post) => post.userId === 'current').slice(0, 9);

  const formatCount = (count: number | undefined | null): string => {
    const n = Number(count) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const openEditModal = () => {
    if (!currentUser) return;
    setEditSnapshot({
      displayName: currentUser.displayName,
      bio: currentUser.bio,
      website: currentUser.website || '',
      avatar: currentUser.avatar || '',
    });
    setEditDisplayName(currentUser.displayName);
    setEditBio(currentUser.bio);
    setEditWebsite(currentUser.website || '');
    setAvatarDraftUri(null);
    setAvatarDraftRemoved(false);
    setShowEditModal(true);
  };

  const discardEditModal = () => {
    setRemovePhotoConfirmVisible(false);
    setShowEditModal(false);
    setEditSnapshot(null);
    setAvatarDraftUri(null);
    setAvatarDraftRemoved(false);
  };

  const handleSave = async () => {
    if (!editDisplayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty.');
      return;
    }
    if (!editSnapshot) return;

    setIsSaving(true);
    try {
      const hadServerAvatar = Boolean(editSnapshot.avatar?.trim());

      if (avatarDraftRemoved && hadServerAvatar) {
        await deleteAvatar();
      } else if (avatarDraftUri) {
        await updateAvatar(avatarDraftUri);
      }

      await updateProfile({
        displayName: editDisplayName.trim(),
        bio: editBio.trim(),
        website: editWebsite.trim() || undefined,
      });

      setShowEditModal(false);
      setEditSnapshot(null);
      setAvatarDraftUri(null);
      setAvatarDraftRemoved(false);
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

  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to change your profile photo.',
      );
      return false;
    }
    return true;
  };

  const handleChangePhoto = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const selectedUri = result.assets[0].uri;
    setAvatarDraftUri(selectedUri);
    setAvatarDraftRemoved(false);
  };

  /** Ảnh đang xem trong modal (draft), chưa lưu server */
  const baseAvatarInModal = editSnapshot?.avatar?.trim() || '';
  const hasAvatarInEditor =
    !avatarDraftRemoved &&
    (Boolean(avatarDraftUri) || Boolean(baseAvatarInModal));

  const handleRemovePhoto = () => {
    const hasBase = Boolean(baseAvatarInModal);
    const hasDraftPic = Boolean(avatarDraftUri);
    if (!hasBase && !hasDraftPic) return;
    setRemovePhotoConfirmVisible(true);
  };

  const confirmRemovePhoto = () => {
    setRemovePhotoConfirmVisible(false);
    setAvatarDraftUri(null);
    setAvatarDraftRemoved(true);
  };

  if (!currentUser) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={currentUser.username}
        avatarUser={currentUser}
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

        <View style={styles.bioContainer}>
          <Text style={styles.displayName}>{currentUser.displayName}</Text>
          <Text style={styles.bio}>{currentUser.bio}</Text>
          {currentUser.website && (
            <Text style={styles.website}>{currentUser.website}</Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
            <Feather name="user" size={16} color={AppColors.text} strokeWidth={2} />
            <Text style={styles.editButtonText}> Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={handleShareProfile}>
            <Feather name="share" size={16} color={AppColors.text} strokeWidth={2} />
            <Text style={styles.editButtonText}> Share</Text>
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

        <View style={styles.tabsContainer}>
          <View style={[styles.tab, styles.activeTab]}>
            <Feather name="grid" size={22} color={AppColors.primary} strokeWidth={2} />
          </View>
          <View style={styles.tab}>
            <Feather name="tag" size={22} color={AppColors.iconMuted} strokeWidth={2} />
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
        onRequestClose={discardEditModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleLayer} pointerEvents="none">
              <Text style={styles.modalTitle}>Edit Profile</Text>
            </View>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity onPress={discardEditModal} disabled={isSaving}>
                <Text style={[styles.modalCancel, isSaving && styles.textMuted]}>Cancel</Text>
              </TouchableOpacity>
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
          </View>

          <ScrollView
            style={styles.modalForm}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalAvatarSection}>
              <View style={styles.avatarWrapper}>
                {avatarDraftRemoved ? (
                  <RNImage source={defaultAvatar} style={styles.avatarPreview} />
                ) : avatarDraftUri || baseAvatarInModal ? (
                  <RNImage
                    source={
                      avatarDraftUri
                        ? { uri: avatarDraftUri }
                        : { uri: baseAvatarInModal }
                    }
                    style={styles.avatarPreview}
                  />
                ) : (
                  <RNImage source={defaultAvatar} style={styles.avatarPreview} />
                )}
                {isSaving && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color="white" />
                  </View>
                )}
              </View>
              <View style={styles.photoActions}>
                <TouchableOpacity
                  onPress={handleChangePhoto}
                  disabled={isSaving}
                >
                  <Text style={[styles.changePhotoText, isSaving && styles.textMuted]}>
                    {hasAvatarInEditor ? 'Change Photo' : 'Add Photo'}
                  </Text>
                </TouchableOpacity>
                {hasAvatarInEditor && (
                  <TouchableOpacity
                    onPress={handleRemovePhoto}
                    disabled={isSaving}
                    style={styles.removePhotoBtn}
                  >
                    <Feather name="trash-2" size={16} color={AppColors.error} strokeWidth={2} />
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
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
                editable={!isSaving}
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
                editable={!isSaving}
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
                editable={!isSaving}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Web: Alert.alert thường không hiện — dùng Modal xác nhận xóa ảnh */}
      <Modal
        visible={removePhotoConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRemovePhotoConfirmVisible(false)}
      >
        <View style={styles.removeConfirmBackdrop}>
          <View style={styles.removeConfirmCard}>
            <Text style={styles.removeConfirmTitle}>Remove photo?</Text>
            <Text style={styles.removeConfirmBody}>
              Your profile picture will be removed when you tap Save. Cancel discards this change.
            </Text>
            <View style={styles.removeConfirmActions}>
              <TouchableOpacity
                style={styles.removeConfirmBtnGhost}
                onPress={() => setRemovePhotoConfirmVisible(false)}
              >
                <Text style={styles.removeConfirmBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeConfirmBtnDanger}
                onPress={() => void confirmRemovePhoto()}
              >
                <Text style={styles.removeConfirmBtnDangerText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  bioContainer: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 16,
  },
  displayName: {
    ...Typography.captionSemibold,
    marginBottom: 2,
    color: AppColors.text,
  },
  bio: {
    ...Typography.caption,
    lineHeight: 20,
    color: AppColors.textSecondary,
  },
  website: {
    ...Typography.caption,
    color: AppColors.primary,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: layoutPadding,
    marginBottom: 20,
  },
  editButton: {
    flex: 1,
    backgroundColor: AppColors.border,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  editButtonText: {
    ...Typography.captionSemibold,
    color: AppColors.text,
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
    position: 'relative',
    paddingHorizontal: layoutPadding,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  /** Tiêu đề căn giữa màn hình; nút Cancel/Save nằm layer trên (zIndex) */
  modalTitleLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 1,
  },
  modalCancel: {
    ...Typography.body,
    fontSize: 16,
    color: AppColors.text,
  },
  modalTitle: {
    ...Typography.sectionTitle,
    color: AppColors.text,
    textAlign: 'center',
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
    width: '100%',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: layoutPadding,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
    marginBottom: 8,
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    marginBottom: 10,
  },
  avatarPreview: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AppColors.border,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActions: {
    alignItems: 'center',
    gap: 12,
  },
  changePhotoText: {
    ...Typography.bodySemibold,
    color: AppColors.primary,
  },
  textMuted: {
    opacity: 0.5,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removePhotoText: {
    ...Typography.caption,
    color: AppColors.error,
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
  removeConfirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  removeConfirmCard: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  removeConfirmTitle: {
    ...Typography.bodySemibold,
    fontSize: 18,
    color: AppColors.text,
    marginBottom: 8,
  },
  removeConfirmBody: {
    ...Typography.caption,
    fontSize: 14,
    color: AppColors.textMuted,
    lineHeight: 20,
    marginBottom: 18,
  },
  removeConfirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  removeConfirmBtnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  removeConfirmBtnGhostText: {
    ...Typography.bodySemibold,
    color: AppColors.textMuted,
  },
  removeConfirmBtnDanger: {
    backgroundColor: AppColors.error,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  removeConfirmBtnDangerText: {
    ...Typography.bodySemibold,
    color: '#fff',
  },
});
