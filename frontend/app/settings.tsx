import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppColors } from '../constants/theme';
import { useApp } from '../context/AppContext';

interface SettingsItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  toggle?: boolean;
  valueBool?: boolean;
  onToggle?: (val: boolean) => void;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  label,
  value,
  onPress,
  showArrow = true,
  toggle = false,
  valueBool = false,
  onToggle,
}) => (
  <TouchableOpacity
    style={styles.settingsItem}
    onPress={onPress}
    disabled={toggle}
    activeOpacity={onPress ? 0.6 : 1}
  >
    <View style={styles.settingsItemLeft}>
      <View style={styles.iconWrap}>
        <Feather name={icon as any} size={20} color={AppColors.text} />
      </View>
      <Text style={styles.settingsLabel}>{label}</Text>
    </View>
    <View style={styles.settingsItemRight}>
      {value && <Text style={styles.settingsValue}>{value}</Text>}
      {toggle && onToggle && (
        <Switch
          value={valueBool}
          onValueChange={onToggle}
          trackColor={{ false: AppColors.border, true: AppColors.primaryLight }}
          thumbColor={valueBool ? AppColors.primary : AppColors.surfaceElevated}
        />
      )}
      {showArrow && !toggle && (
        <Feather name="chevron-right" size={20} color={AppColors.textMuted} />
      )}
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, deleteAccount } = useApp();
  const [privateAccount, setPrivateAccount] = React.useState(false);
  const [mutedAccounts, setMutedAccounts] = React.useState(false);
  const [activityStatus, setActivityStatus] = React.useState(true);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = React.useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [logoutBusy, setLogoutBusy] = React.useState(false);

  const handleLogout = () => {
    setLogoutConfirmVisible(true);
  };

  const performLogout = async () => {
    setLogoutBusy(true);
    try {
      await logout();
      setLogoutConfirmVisible(false);
      router.replace('/auth/login' as any);
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
      router.replace('/auth/login' as any);
    } catch (e) {
      Alert.alert(
        'Could not delete account',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <SettingsItem icon="user" label="Edit Profile" onPress={() => {}} showArrow />
          <SettingsItem icon="lock" label="Change Password" onPress={() => {}} showArrow />
          <SettingsItem icon="shield" label="Privacy & Security" onPress={() => {}} showArrow />
          <SettingsItem
            icon="key"
            label="Private Account"
            toggle
            valueBool={privateAccount}
            onToggle={setPrivateAccount}
            showArrow={false}
          />
        </View>

        {/* Notifications Section */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.section}>
          <SettingsItem
            icon="bell-off"
            label="Muted Accounts"
            toggle
            valueBool={mutedAccounts}
            onToggle={setMutedAccounts}
            showArrow={false}
          />
          <SettingsItem
            icon="eye"
            label="Activity Status"
            toggle
            valueBool={activityStatus}
            onToggle={setActivityStatus}
            showArrow={false}
          />
          <SettingsItem icon="bell" label="Push Notifications" onPress={() => {}} showArrow />
        </View>

        {/* Content Section */}
        <Text style={styles.sectionTitle}>Content</Text>
        <View style={styles.section}>
          <SettingsItem icon="grid" label="Posts" value="Public" onPress={() => {}} />
          <SettingsItem icon="video" label="Reels" value="Public" onPress={() => {}} />
          <SettingsItem icon="music" label="Music" value="Public" onPress={() => {}} />
          <SettingsItem icon="globe" label="Language" value="English" onPress={() => {}} />
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <SettingsItem icon="info" label="Help Center" onPress={() => {}} showArrow />
          <SettingsItem icon="file-text" label="Terms of Service" onPress={() => {}} showArrow />
          <SettingsItem icon="shield" label="Privacy Policy" onPress={() => {}} showArrow />
          <SettingsItem icon="code" label="Version" value="1.0.0" showArrow={false} />
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: AppColors.error }]}>Account Actions</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerItem} onPress={handleLogout}>
            <Feather name="log-out" size={20} color={AppColors.text} />
            <Text style={styles.dangerText}>Log Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
            <Feather name="trash-2" size={20} color={AppColors.error} />
            <Text style={[styles.dangerText, { color: AppColors.error }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Log out confirmation — Modal works reliably on Web */}
      <Modal
        visible={logoutConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => !logoutBusy && setLogoutConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.modalHint}>
              Are you sure you want to log out of your current account?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => !logoutBusy && setLogoutConfirmVisible(false)}
                disabled={logoutBusy}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnDanger}
                onPress={() => void performLogout()}
                disabled={logoutBusy}
              >
                {logoutBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnDangerText}>Log out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete account — step 1: confirm */}
      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account?</Text>
            <Text style={styles.modalHint}>
              This cannot be undone. You will need to enter your password on the next step.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnDanger}
                onPress={openDeletePasswordModal}
              >
                <Text style={styles.modalBtnDangerText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
            <Text style={styles.modalTitle}>Confirm account deletion</Text>
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
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnDanger}
                onPress={() => void submitDeleteAccount()}
                disabled={deleteBusy}
              >
                {deleteBusy ? (
                  <ActivityIndicator color="#fff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  content: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: 16,
  },
  section: {
    backgroundColor: AppColors.surfaceElevated,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: AppColors.border,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 15,
    color: AppColors.text,
    marginLeft: 12,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsValue: {
    fontSize: 14,
    color: AppColors.textMuted,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
    gap: 12,
  },
  dangerText: {
    fontSize: 15,
    color: AppColors.text,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 14,
    color: AppColors.textMuted,
    marginBottom: 14,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.text,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalBtnSecondaryText: {
    fontSize: 16,
    color: AppColors.textMuted,
    fontWeight: '600',
  },
  modalBtnDanger: {
    backgroundColor: AppColors.error,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnDangerText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
});
