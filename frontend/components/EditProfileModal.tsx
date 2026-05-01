import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image as RNImage,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { AppColors, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import defaultAvatar from '../assets/images/default-avatar.png';

type GenderOption = { label: string; value: string };
const GENDER_OPTIONS: GenderOption[] = [
  { label: 'Not specified', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

type EditFormSnapshot = {
  fullName: string;
  gender: string;
  bio: string;
  website: string;
  avatar: string;
};

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { currentUser, updateProfile, updateAvatar, deleteAvatar } = useApp();

  const [editSnapshot, setEditSnapshot] = useState<EditFormSnapshot | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarDraftUri, setAvatarDraftUri] = useState<string | null>(null);
  const [avatarDraftRemoved, setAvatarDraftRemoved] = useState(false);
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);

  const open = () => {
    if (!currentUser) return;
    setEditSnapshot({
      fullName: currentUser.fullName,
      gender: currentUser.gender,
      bio: currentUser.bio,
      website: currentUser.website || '',
      avatar: currentUser.avatar || '',
    });
    setEditFullName(currentUser.fullName);
    setEditGender(currentUser.gender);
    setEditBio(currentUser.bio);
    setEditWebsite(currentUser.website || '');
    setAvatarDraftUri(null);
    setAvatarDraftRemoved(false);
  };

  const handleClose = () => {
    setEditSnapshot(null);
    setAvatarDraftUri(null);
    setAvatarDraftRemoved(false);
    setRemoveConfirmVisible(false);
    onClose();
  };

  const handleSave = async () => {
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
        fullName: editFullName.trim(),
        gender: editGender.trim(),
        bio: editBio.trim(),
        website: editWebsite.trim() || undefined,
      });

      handleClose();
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
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

    setAvatarDraftUri(result.assets[0].uri);
    setAvatarDraftRemoved(false);
  };

  const baseAvatarInModal = editSnapshot?.avatar?.trim() || '';
  const hasAvatarInEditor =
    !avatarDraftRemoved &&
    (Boolean(avatarDraftUri) || Boolean(baseAvatarInModal));

  const handleRemovePhoto = () => {
    if (!hasAvatarInEditor) return;
    setRemoveConfirmVisible(true);
  };

  const confirmRemovePhoto = () => {
    setRemoveConfirmVisible(false);
    setAvatarDraftUri(null);
    setAvatarDraftRemoved(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      onShow={open}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleLayer} pointerEvents="none">
            <Text style={styles.modalTitle}>Edit Profile</Text>
          </View>
          <View style={styles.modalHeaderRow}>
            <TouchableOpacity onPress={handleClose} disabled={isSaving}>
              <Text style={[styles.modalCancel, isSaving && styles.textMuted]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={AppColors.primary} />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
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
              <TouchableOpacity onPress={handleChangePhoto} disabled={isSaving}>
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
            <Text style={styles.formLabel}>Full Name</Text>
            <TextInput
              style={styles.formInput}
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="Your full name"
              placeholderTextColor={AppColors.textMuted}
              maxLength={100}
              editable={!isSaving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Gender</Text>
            <View style={styles.genderPickerRow}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.genderOption,
                    editGender === opt.value && styles.genderOptionSelected,
                  ]}
                  onPress={() => setEditGender(opt.value)}
                  disabled={isSaving}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      editGender === opt.value && styles.genderOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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

      {/* Remove photo confirmation */}
      <Modal
        visible={removeConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRemoveConfirmVisible(false)}
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
                onPress={() => setRemoveConfirmVisible(false)}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  genderPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  genderOption: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  genderOptionSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  genderOptionText: {
    ...Typography.caption,
    color: AppColors.text,
  },
  genderOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
