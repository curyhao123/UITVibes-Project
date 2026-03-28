import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
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
  const { logout } = useApp();
  const [privateAccount, setPrivateAccount] = React.useState(false);
  const [mutedAccounts, setMutedAccounts] = React.useState(false);
  const [activityStatus, setActivityStatus] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deleted', 'Your account has been deleted.');
          },
        },
      ]
    );
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
});
