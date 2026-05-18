import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { AppColors, borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { useApp } from '../context/AppContext';
import { EditProfileModal } from '../components';
import { SettingsSection, SettingsRow } from '../components/settings';
import defaultAvatar from '../assets/images/default-avatar.png';

// ─── Profile Summary Card ────────────────────────────────────────────────────

interface ProfileCardProps {
  onEditPress: () => void;
}

function ProfileCard({ onEditPress }: ProfileCardProps) {
  const { currentUser } = useApp();
  const profileRouter = useRouter();

  if (!currentUser) return null;

  return (
    <View style={profileStyles.card}>
      {/* Avatar */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => profileRouter.push('/(tabs)/profile' as any)}
        style={profileStyles.avatarTouchArea}
      >
        {currentUser.avatar ? (
          <Image
            source={{ uri: currentUser.avatar }}
            style={profileStyles.avatar}
            contentFit="cover"
          />
        ) : (
          <Image
            source={defaultAvatar}
            style={profileStyles.avatar}
            contentFit="cover"
          />
        )}
      </TouchableOpacity>

      {/* Name + handle */}
      <View style={profileStyles.identity}>
        <Text style={profileStyles.displayName} numberOfLines={1}>
          {currentUser.username}
        </Text>
        <Text style={profileStyles.username} numberOfLines={1}>
          @{currentUser.displayName}
        </Text>
        {currentUser.bio ? (
          <Text style={profileStyles.bio} numberOfLines={2}>
            {currentUser.bio}
          </Text>
        ) : null}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={profileStyles.editBtn}
        activeOpacity={0.75}
        onPress={onEditPress}
      >
        <Text style={profileStyles.editBtnText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  card: {
    marginHorizontal: layoutPadding,
    marginBottom: 28,
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    // Soft premium shadow
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 14,
  },
  avatarTouchArea: {
    flexShrink: 0,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.borderLight,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    ...Typography.sectionTitle,
    color: AppColors.text,
    fontWeight: '700',
  },
  username: {
    ...Typography.caption,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  bio: {
    ...Typography.caption,
    color: AppColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  editBtn: {
    flexShrink: 0,
    backgroundColor: `${AppColors.primary}12`,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: `${AppColors.primary}30`,
  },
  editBtnText: {
    ...Typography.captionSemibold,
    color: AppColors.primary,
  },
});

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const settingsRouter = useRouter();
  const { logout, currentUser } = useApp();

  // Toggle states
  const [privateAccount, setPrivateAccount] = useState(false);
  const [mutedAccounts, setMutedAccounts] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);

  // Modal states
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const safePush = useCallback(
    (path: string) => {
      settingsRouter.push(path as any);
    },
    [settingsRouter],
  );

  // ── Logout ────────────────────────────────────────────────────────────────
  const performLogout = async () => {
    setLogoutBusy(true);
    try {
      await logout();
      setLogoutConfirmVisible(false);
      settingsRouter.replace('/auth/login' as any);
    } finally {
      setLogoutBusy(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmVisible(true);
  };

  const openDeletePasswordModal = () => {
    setDeleteConfirmVisible(false);
    setDeletePassword('');
    setDeleteModalVisible(true);
  };

  const submitDeleteAccount = async () => {
    const pwd = deletePassword.trim();
    if (!pwd) {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }
    setDeleteBusy(true);
    try {
      await logout();
      setDeleteModalVisible(false);
      setDeletePassword('');
      settingsRouter.replace('/auth/login' as any);
    } catch (e) {
      Alert.alert(
        'Could not delete account',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  // ── Body ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => settingsRouter.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Profile Card ── */}
        <ProfileCard onEditPress={() => setShowEditModal(true)} />

        {/* ── ACCOUNT ── */}
        <SettingsSection title="Account">
          <SettingsRow
            icon="lock"
            label="Change Password"
            onPress={() => settingsRouter.push('/change-password' as any)}
            isFirst
          />
          <SettingsRow
            icon="shield"
            label="Privacy & Security"
            onPress={() => {}}
          />
          <SettingsRow
            icon="user-x"
            label="Blocked Accounts"
            onPress={() => settingsRouter.push('/blocked-accounts' as any)}
          />
          <SettingsRow
            icon="key"
            label="Private Account"
            isToggle
            toggleValue={privateAccount}
            onToggle={setPrivateAccount}
            isLast
          />
        </SettingsSection>

        {/* ── NOTIFICATIONS ── */}
        <SettingsSection title="Notifications">
          <SettingsRow
            icon="bell-off"
            label="Muted Accounts"
            isToggle
            toggleValue={mutedAccounts}
            onToggle={setMutedAccounts}
            isFirst
          />
          <SettingsRow
            icon="eye"
            label="Activity Status"
            isToggle
            toggleValue={activityStatus}
            onToggle={setActivityStatus}
          />
          <SettingsRow
            icon="bell"
            label="Push Notifications"
            onPress={() => {}}
            isLast
          />
        </SettingsSection>

        {/* ── CONTENT ── */}
        <SettingsSection title="Content">
          <SettingsRow
            icon="grid"
            label="Posts"
            value="Public"
            onPress={() => {}}
            isFirst
          />
          <SettingsRow
            icon="video"
            label="Reels"
            value="Public"
            onPress={() => {}}
          />
          <SettingsRow
            icon="music"
            label="Music"
            value="Public"
            onPress={() => {}}
          />
          <SettingsRow
            icon="globe"
            label="Language"
            value="English"
            onPress={() => {}}
            isLast
          />
        </SettingsSection>

        {/* ── SUPPORT ── */}
        <SettingsSection title="Support">
          <SettingsRow
            icon="info"
            label="Help Center"
            onPress={() => settingsRouter.push('/help' as any)}
            isFirst
          />
          <SettingsRow
            icon="file-text"
            label="Terms of Service"
            onPress={() => settingsRouter.push('/terms' as any)}
          />
          <SettingsRow
            icon="shield"
            label="Privacy Policy"
            onPress={() => settingsRouter.push('/privacy' as any)}
            isLast
          />
        </SettingsSection>

        {/* ── ACTIONS ── */}
        <SettingsSection title="Account Actions">
          <SettingsRow
            icon="log-out"
            label="Log Out"
            onPress={() => setLogoutConfirmVisible(true)}
            variant="default"
            isFirst
          />
          <SettingsRow
            icon="trash-2"
            label="Delete Account"
            onPress={handleDeleteAccount}
            variant="danger"
            isLast
          />
        </SettingsSection>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>UITVibes</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      {/* ── Logout confirmation ── */}
      <Modal
        visible={logoutConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => !logoutBusy && setLogoutConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Feather name="log-out" size={24} color={AppColors.primary} />
            </View>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.modalHint}>
              Are you sure you want to log out of your account?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => !logoutBusy && setLogoutConfirmVisible(false)}
                disabled={logoutBusy}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={() => void performLogout()}
                disabled={logoutBusy}
                activeOpacity={0.8}
              >
                {logoutBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Log out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete account — step 1: confirm ── */}
      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: `${AppColors.error}15` }]}>
              <Feather name="trash-2" size={24} color={AppColors.error} />
            </View>
            <Text style={styles.modalTitle}>Delete account?</Text>
            <Text style={styles.modalHint}>
              This cannot be undone. You'll need to enter your password on the next step.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => setDeleteConfirmVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnDanger}
                onPress={openDeletePasswordModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnDangerText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete account — step 2: password ── */}
      <Modal
        visible={deleteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !deleteBusy && setDeleteModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm deletion</Text>
            <Text style={styles.modalHint}>
              Enter your password to permanently delete your account.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Password"
              placeholderTextColor={AppColors.textMuted}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              editable={!deleteBusy}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => {
                  if (!deleteBusy) {
                    setDeleteModalVisible(false);
                    setDeletePassword('');
                  }
                }}
                disabled={deleteBusy}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnDanger}
                onPress={() => void submitDeleteAccount()}
                disabled={deleteBusy}
                activeOpacity={0.8}
              >
                {deleteBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnDangerText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 14,
    backgroundColor: AppColors.background,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  headerTitle: {
    ...Typography.screenTitle,
    color: AppColors.text,
    flex: 1,
  },
  headerRight: {
    width: 36,
  },
  scrollContent: {
    paddingTop: 8,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...Typography.screenTitle,
    color: AppColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: AppColors.text,
    marginBottom: 20,
    backgroundColor: AppColors.background,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: AppColors.background,
    borderWidth: 1.5,
    borderColor: AppColors.border,
  },
  modalBtnSecondaryText: {
    ...Typography.bodySemibold,
    color: AppColors.text,
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: AppColors.primary,
    minHeight: 50,
    justifyContent: 'center',
  },
  modalBtnPrimaryText: {
    ...Typography.bodySemibold,
    color: '#fff',
  },
  modalBtnDanger: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: AppColors.error,
    minHeight: 50,
    justifyContent: 'center',
  },
  modalBtnDangerText: {
    ...Typography.bodySemibold,
    color: '#fff',
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 4,
  },
  footerBrand: {
    ...Typography.captionSemibold,
    color: AppColors.iconMuted,
    letterSpacing: 0.3,
  },
  footerVersion: {
    ...Typography.meta,
    color: AppColors.iconMuted,
    letterSpacing: 0.5,
  },
});
