import React, { useEffect, useState } from 'react';
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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { useApp } from '../context/AppContext';
import { useTheme, type ThemePreference } from '../context/ThemeContext';
import { ConfirmationModal, EditProfileModal } from '../components';
import { SettingsSection, SettingsRow } from '../components/settings';
import { CompactHeader } from '../components/StaticPremiumHeader';
import defaultAvatar from '../assets/images/default-avatar.png';
import {
  CONTENT_VISIBILITY_OPTIONS,
  ContentType,
  ContentVisibility,
  getDefaultContentVisibilities,
  setDefaultContentVisibility,
} from '../services/contentPreferences';

// ─── Profile Summary Card ────────────────────────────────────────────────────

interface ProfileCardProps {
  onEditPress: () => void;
}

function ProfileCard({ onEditPress }: ProfileCardProps) {
  const { currentUser } = useApp();
  const { colors, isDark } = useTheme();
  const profileRouter = useRouter();

  if (!currentUser) return null;

  return (
    <View
      style={[
        profileStyles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          borderWidth: isDark ? 1 : 0,
          shadowColor: isDark ? '#000000' : '#2D3748',
        },
      ]}
    >
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
        <Text
          style={[profileStyles.displayName, { color: colors.text }]}
          numberOfLines={1}
        >
          {currentUser.username}
        </Text>
        <Text
          style={[profileStyles.username, { color: colors.textMuted }]}
          numberOfLines={1}
        >
          @{currentUser.displayName}
        </Text>
        {currentUser.bio ? (
          <Text
            style={[profileStyles.bio, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {currentUser.bio}
          </Text>
        ) : null}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[
          profileStyles.editBtn,
          {
            backgroundColor: `${colors.primary}15`,
            borderColor: `${colors.primary}35`,
          },
        ]}
        activeOpacity={0.75}
        onPress={onEditPress}
      >
        <Text style={[profileStyles.editBtnText, { color: colors.primary }]}>
          Edit Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  card: {
    marginHorizontal: layoutPadding,
    marginBottom: 28,
    borderRadius: borderRadius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    ...Typography.sectionTitle,
    fontWeight: '700',
  },
  username: {
    ...Typography.caption,
    marginTop: 2,
  },
  bio: {
    ...Typography.caption,
    marginTop: 4,
    lineHeight: 18,
  },
  editBtn: {
    flexShrink: 0,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  editBtnText: {
    ...Typography.captionSemibold,
  },
});

// ─── Settings Screen ──────────────────────────────────────────────────────────

const THEME_OPTIONS: {
  id: ThemePreference;
  label: string;
  subtitle: string;
  icon: 'smartphone' | 'sun' | 'moon';
}[] = [
  {
    id: 'system',
    label: 'System (Auto)',
    subtitle: 'Follows device system appearance',
    icon: 'smartphone',
  },
  {
    id: 'light',
    label: 'Light Mode',
    subtitle: 'Classic warm and crisp aesthetic',
    icon: 'sun',
  },
  {
    id: 'dark',
    label: 'Dark Mode',
    subtitle: 'Modern deep charcoal dark theme',
    icon: 'moon',
  },
];

export default function SettingsScreen() {
  const settingsRouter = useRouter();
  const { logout, deleteAccount } = useApp();
  const { themePreference, setThemePreference, colors, isDark } = useTheme();

  // Modal states
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [postVisibility, setPostVisibility] = useState<ContentVisibility>('Public');
  const [reelVisibility, setReelVisibility] = useState<ContentVisibility>('Public');
  const [visibilityPickerType, setVisibilityPickerType] = useState<ContentType | null>(null);

  useEffect(() => {
    let active = true;

    void getDefaultContentVisibilities()
      .then((preferences) => {
        if (!active) return;
        setPostVisibility(preferences.post);
        setReelVisibility(preferences.reels);
      })
      .catch((error) => {
        console.warn('Failed to load content visibility defaults:', error);
      });

    return () => {
      active = false;
    };
  }, []);

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
      await deleteAccount(pwd);
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

  const selectVisibility = async (visibility: ContentVisibility) => {
    if (!visibilityPickerType) return;

    const type = visibilityPickerType;
    setVisibilityPickerType(null);

    if (type === 'post') {
      setPostVisibility(visibility);
    } else {
      setReelVisibility(visibility);
    }

    try {
      await setDefaultContentVisibility(type, visibility);
    } catch (error) {
      Alert.alert('Could not save setting', 'Please try again.');
      console.warn('Failed to save content visibility default:', error);
    }
  };

  const handleSelectTheme = async (pref: ThemePreference) => {
    await setThemePreference(pref);
    setShowThemePicker(false);
  };

  // ── Body ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ── */}
      <CompactHeader
        title="Settings"
        showBack
        onBack={() => settingsRouter.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Profile Card ── */}
        <ProfileCard onEditPress={() => setShowEditModal(true)} />

        {/* ── APPEARANCE ── */}
        <SettingsSection title="Appearance">
          <SettingsRow
            icon={isDark ? 'moon' : 'sun'}
            label="Theme"
            value={
              themePreference === 'system'
                ? 'System (Auto)'
                : themePreference === 'dark'
                  ? 'Dark Mode'
                  : 'Light Mode'
            }
            onPress={() => setShowThemePicker(true)}
            isFirst
            isLast
          />
        </SettingsSection>

        {/* ── ACCOUNT ── */}
        <SettingsSection title="Account">
          <SettingsRow
            icon="lock"
            label="Change Password"
            onPress={() => settingsRouter.push('/change-password' as any)}
            isFirst
          />
          <SettingsRow
            icon="bookmark"
            label="Saved"
            onPress={() => settingsRouter.push('/archive' as any)}
          />
          <SettingsRow
            icon="shield"
            label="Privacy & Security"
            onPress={() => settingsRouter.push('/privacy' as any)}
          />
          <SettingsRow
            icon="user-x"
            label="Blocked Accounts"
            onPress={() => settingsRouter.push('/blocked-accounts' as any)}
          />
          <SettingsRow
            icon="key"
            label="Private Account"
            value="Coming soon"
            showChevron={false}
            isLast
          />
        </SettingsSection>

        {/* ── NOTIFICATIONS ── */}
        <SettingsSection title="Notifications">
          <SettingsRow
            icon="bell-off"
            label="Muted Accounts"
            value="Coming soon"
            showChevron={false}
            isFirst
          />
          <SettingsRow
            icon="eye"
            label="Activity Status"
            value="Coming soon"
            showChevron={false}
          />
          <SettingsRow
            icon="bell"
            label="Push Notifications"
            value="Coming soon"
            showChevron={false}
            isLast
          />
        </SettingsSection>

        {/* ── CONTENT ── */}
        <SettingsSection title="Content">
          <SettingsRow
            icon="grid"
            label="Posts"
            value={postVisibility}
            onPress={() => setVisibilityPickerType('post')}
            isFirst
          />
          <SettingsRow
            icon="video"
            label="Reels"
            value={reelVisibility}
            onPress={() => setVisibilityPickerType('reels')}
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
          <Text style={[styles.footerBrand, { color: colors.iconMuted }]}>UITVibes</Text>
          <Text style={[styles.footerVersion, { color: colors.textMuted }]}>Version 1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      {/* ── Theme Picker Modal ── */}
      <Modal
        visible={showThemePicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowThemePicker(false)}
      >
        <Pressable
          style={styles.optionBackdrop}
          onPress={() => setShowThemePicker(false)}
        >
          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            onPress={() => undefined}
          >
            <View
              style={[
                styles.optionHeader,
                { borderBottomColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Choose Theme
              </Text>
              <TouchableOpacity
                style={[
                  styles.optionClose,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setShowThemePicker(false)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {THEME_OPTIONS.map((opt, index) => {
              const selected = themePreference === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.optionItem,
                    index > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.borderLight,
                    },
                    selected && {
                      backgroundColor: `${colors.primary}12`,
                    },
                  ]}
                  onPress={() => void handleSelectTheme(opt.id)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.optionItemIcon,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Feather
                      name={opt.icon}
                      size={18}
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <View style={styles.optionItemText}>
                    <Text
                      style={[
                        styles.optionItemLabel,
                        { color: selected ? colors.primary : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionItemSubtitle,
                        { color: colors.textMuted },
                      ]}
                    >
                      {opt.subtitle}
                    </Text>
                  </View>
                  {selected && (
                    <Feather name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Content visibility picker */}
      <Modal
        visible={visibilityPickerType !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setVisibilityPickerType(null)}
      >
        <Pressable
          style={styles.optionBackdrop}
          onPress={() => setVisibilityPickerType(null)}
        >
          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            onPress={() => undefined}
          >
            <View
              style={[
                styles.optionHeader,
                { borderBottomColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Default {visibilityPickerType === 'reels' ? 'reels' : 'post'} visibility
              </Text>
              <TouchableOpacity
                style={[
                  styles.optionClose,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setVisibilityPickerType(null)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            {CONTENT_VISIBILITY_OPTIONS.map((visibility, index) => {
              const selected =
                visibilityPickerType === 'reels'
                  ? reelVisibility === visibility
                  : postVisibility === visibility;
              const icon =
                visibility === 'Public'
                  ? 'globe'
                  : visibility === 'Followers'
                    ? 'users'
                    : 'lock';

              return (
                <TouchableOpacity
                  key={visibility}
                  style={[
                    styles.optionItem,
                    index > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.borderLight,
                    },
                    selected && {
                      backgroundColor: `${colors.primary}12`,
                    },
                  ]}
                  onPress={() => void selectVisibility(visibility)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.optionItemIcon,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Feather
                      name={icon}
                      size={18}
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <View style={styles.optionItemText}>
                    <Text
                      style={[
                        styles.optionItemLabel,
                        { color: selected ? colors.primary : colors.text },
                      ]}
                    >
                      {visibility}
                    </Text>
                    <Text
                      style={[
                        styles.optionItemSubtitle,
                        { color: colors.textMuted },
                      ]}
                    >
                      {visibility === 'Public'
                        ? 'Anyone can see it'
                        : visibility === 'Followers'
                          ? 'Only followers can see it'
                          : 'Only you can see it'}
                    </Text>
                  </View>
                  {selected && (
                    <Feather name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Logout confirmation */}
      <ConfirmationModal
        visible={logoutConfirmVisible}
        title="Log out?"
        message="Are you sure you want to log out of your account?"
        icon="log-out"
        variant="primary"
        confirmLabel="Log out"
        busy={logoutBusy}
        onCancel={() => setLogoutConfirmVisible(false)}
        onConfirm={() => void performLogout()}
      />

      {/* Delete account step 1: confirm */}
      <ConfirmationModal
        visible={deleteConfirmVisible}
        title="Delete account?"
        message="This cannot be undone. You'll need to enter your password on the next step."
        icon="trash-2"
        variant="danger"
        confirmLabel="Continue"
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={openDeletePasswordModal}
      />

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
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Confirm deletion
            </Text>
            <Text style={[styles.modalHint, { color: colors.textMuted }]}>
              Enter your password to permanently delete your account.
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              editable={!deleteBusy}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalBtnSecondary,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  if (!deleteBusy) {
                    setDeleteModalVisible(false);
                    setDeletePassword('');
                  }
                }}
                disabled={deleteBusy}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnDanger,
                  { backgroundColor: colors.error },
                ]}
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
  modalTitle: {
    ...Typography.screenTitle,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
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
    borderWidth: 1.5,
  },
  modalBtnSecondaryText: {
    ...Typography.bodySemibold,
  },
  modalBtnDanger: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    minHeight: 50,
    justifyContent: 'center',
  },
  modalBtnDangerText: {
    ...Typography.bodySemibold,
    color: '#fff',
  },
  optionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  optionCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 9,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionTitle: {
    ...Typography.sectionTitle,
    fontSize: 17,
  },
  optionClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  optionItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionItemText: {
    flex: 1,
    minWidth: 0,
  },
  optionItemLabel: {
    ...Typography.bodySemibold,
  },
  optionItemSubtitle: {
    ...Typography.caption,
    marginTop: 2,
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
    letterSpacing: 0.3,
  },
  footerVersion: {
    ...Typography.meta,
  },
});
