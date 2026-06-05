/**
 * PrivacyPolicyScreen — modern, trustworthy privacy policy for a social media app.
 *
 * Architecture:
 * - CompactHeader: matches all other screen headers in the app (help, settings, terms)
 * - Hero block: title + subtitle + last-updated date — clean, not legal-heavy
 * - Summary card: friendly overview before diving into sections
 * - Trust highlights: 3 horizontal reassurance cards (trust, control, security)
 * - Privacy sections: PrivacySection accordion components with bullet points
 * - Manage CTA: actionable buttons to privacy settings, account security, support
 *
 * Design rationale:
 * - Accordion UI keeps the page scannable — users tap what interests them
 * - Bullet list format in each section makes content digestible, not walls of text
 * - Trust highlight cards break up dense content with visual reassurance
 * - Summary card at top reduces anxiety before reading full policy
 * - Manage privacy CTA gives users an escape valve to take action
 * - All colors from AppColors palette; all spacing from layoutPadding / borderRadius
 * - LayoutAnimation (UI thread) for accordion — zero JS re-render cost
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CompactHeader } from '../components/StaticPremiumHeader';
import { PrivacySection, type PrivacySectionData } from '../components/privacy/PrivacySection';
import { HighlightCard } from '../components/privacy/HighlightCard';
import { InfoCard } from '../components/help/InfoCard';
import { SectionHeader } from '../components/help/SectionHeader';
import { SupportModal } from '../components/contact';
import { AppColors, borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';

// ─── Static data ───────────────────────────────────────────────────────────────

const PRIVACY_SECTIONS: PrivacySectionData[] = [
  {
    id: 'information-collected',
    title: 'Information We Collect',
    bullets: [
      'Profile information (name, username, email, phone number)',
      'Profile photo, bio, and other account details you provide',
      'Posts, comments, likes, and other content you share',
      'Messages, conversations, and friend connections',
      'Device information (model, OS, unique identifiers)',
      'Usage data (features used, time spent, interaction patterns)',
      'Photos and media uploaded to the platform',
      'Payment information for premium features (if applicable)',
    ],
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Data',
    bullets: [
      'Personalize your feed, content recommendations, and search results',
      'Deliver notifications, messages, and account-related alerts',
      'Detect, prevent, and respond to spam, abuse, and policy violations',
      'Improve app performance, fix bugs, and develop new features',
      'Enable account functionality (login, password recovery, security)',
      'Analyze usage patterns to enhance user experience',
      'Comply with legal obligations and law enforcement requests',
    ],
  },
  {
    id: 'profile-content',
    title: 'Profile & Public Content',
    bullets: [
      'Your username, profile photo, and public posts are visible to all users',
      'You can set your account to private to limit visibility',
      'Posts you like or comment on may be visible depending on your privacy settings',
      'Your follower and following lists are public by default',
      'Content you share publicly can be seen and shared by others',
      'We are not responsible for content you voluntarily share publicly',
    ],
  },
  {
    id: 'cookies-device',
    title: 'Cookies & Device Data',
    bullets: [
      'We use essential cookies for authentication and session management',
      'Analytics cookies help us understand how users interact with the app',
      'Device tokens are stored to deliver push notifications',
      'We may collect device type, OS version, and app version for diagnostics',
      'Third-party services (analytics, crash reporting) may collect device data',
      'You can manage cookie preferences in your device settings',
    ],
  },
  {
    id: 'messaging',
    title: 'Messaging & Communication',
    bullets: [
      'Private messages are encrypted end-to-end and only visible to participants',
      'We may scan messages for spam, abuse, and safety purposes (not content mining)',
      'Group conversation details are visible to all members of the group',
      'Reported messages may be reviewed by our moderation team',
      'You can block users to prevent them from messaging you',
      'Deleted messages are removed from our servers within 30 days',
    ],
  },
  {
    id: 'security',
    title: 'Account Security',
    bullets: [
      'We use industry-standard encryption for data in transit and at rest',
      'Two-factor authentication (2FA) is available and recommended',
      'Suspicious login attempts trigger automated security alerts',
      'We never ask for your password outside of the app login flow',
      'You can view and manage active sessions from your account settings',
      'Report any security concerns to security@uitvibes.com immediately',
    ],
  },
  {
    id: 'data-sharing',
    title: 'Data Sharing',
    bullets: [
      'We do not sell your personal data to advertisers or third parties',
      'Data may be shared with trusted service providers (hosting, analytics, FCM)',
      'Legal requests from law enforcement require a valid subpoena or court order',
      'Aggregate, anonymized data may be used for research and platform improvements',
      'If UITVibes is acquired, user data may transfer to the new owner',
      'Third-party integrations (linked apps) have access per their own privacy policies',
    ],
  },
  {
    id: 'data-retention',
    title: 'Data Retention',
    bullets: [
      'Your account data is retained while your account is active',
      'Deleted content is removed from public view within 24 hours',
      'Server-side deletion of deleted content occurs within 30 days',
      'Data required for legal compliance is retained for up to 7 years',
      'Analytics data is anonymized after 14 months of inactivity',
      'Account deletion triggers a 30-day grace period before permanent erasure',
    ],
  },
  {
    id: 'privacy-controls',
    title: 'Your Privacy Controls',
    bullets: [
      'Set your account to private to approve follower requests',
      'Control who can comment on and message your posts',
      'Block or mute users to limit interactions',
      'Hide your online status and last-seen timestamp',
      'Choose what information is visible on your profile',
      'Manage notification preferences to reduce interruptions',
      'Download a copy of your data at any time from settings',
    ],
  },
  {
    id: 'account-deletion',
    title: 'Account Deletion',
    content:
      'You can permanently delete your account at any time from Settings → Account → Delete Account. Deletion is irreversible — all your posts, messages, followers, and data will be permanently removed from our servers within 30 days. Some data may be retained for legal or fraud-prevention purposes as required by law.',
  },
  {
    id: 'children',
    title: "Children's Privacy",
    content:
      'UITVibes is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected data from a child under 13 without parental consent, we will take immediate steps to delete that information. Parents or guardians who believe their child has provided personal data can contact us at privacy@uitvibes.com.',
  },
  {
    id: 'policy-updates',
    title: 'Policy Updates',
    content:
      'We may update this Privacy Policy periodically to reflect changes in our practices, features, or legal requirements. Significant changes will be communicated via in-app announcements and, where appropriate, by email. Continued use of the app after any changes constitutes acceptance of the revised policy. We encourage you to review this page regularly. The "Last updated" date at the top reflects the most recent revision.',
  },
  {
    id: 'contact',
    title: 'Contact Information',
    content:
      'For privacy-specific inquiries, data access requests, or to report a concern, please contact our Data Protection team at privacy@uitvibes.com. For general support, reach out at support@uitvibes.com. We aim to respond to all privacy-related requests within 72 hours and resolve issues within 14 business days.',
  },
];

const TRUST_HIGHLIGHTS = [
  {
    id: 'no-selling',
    icon: 'shield' as const,
    title: 'We do not sell your personal data.',
    description: 'Your data stays yours. Always.',
    variant: 'trust' as const,
  },
  {
    id: 'you-control',
    icon: 'eye' as const,
    title: 'You control your privacy settings.',
    description: 'Decide what is public and what is private.',
    variant: 'control' as const,
  },
  {
    id: 'encrypted',
    icon: 'lock' as const,
    title: 'Your messages are protected.',
    description: 'End-to-end encryption keeps your chats safe.',
    variant: 'security' as const,
  },
];

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const handleContactSupport = () => {
    setSupportModalVisible(true);
  };

  const handleEmailPrivacy = () => {
    // Linking.openURL handled inline
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <CompactHeader
        title="Privacy Policy"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero block ── */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Your Privacy Matters</Text>
          <Text style={styles.heroSubtitle}>
            How we collect, use, and protect your information.
          </Text>
          <View style={styles.lastUpdatedRow}>
            <Feather name="clock" size={13} color={AppColors.iconMuted} strokeWidth={2} />
            <Text style={styles.lastUpdatedText}>Last updated: May 17, 2026</Text>
          </View>
        </View>

        {/* ── Summary card ── */}
        <View style={styles.sectionPadding}>
          <InfoCard variant="summary" icon="shield" title="Our Commitment">
            Your privacy matters to us. We collect only the information necessary to provide features,
            improve your experience, and keep the platform secure. We never sell your data, and you
            are always in control of what you share.
          </InfoCard>
        </View>

        {/* ── Trust highlights ── */}
        <View style={styles.highlightsWrap}>
          {TRUST_HIGHLIGHTS.map((item) => (
            <View key={item.id} style={styles.highlightItem}>
              <HighlightCard
                variant={item.variant}
                icon={item.icon}
                title={item.title}
                description={item.description}
              />
            </View>
          ))}
        </View>

        {/* ── Privacy sections ── */}
        <SectionHeader title="Privacy Details" />
        <View style={styles.accordionWrap}>
          {PRIVACY_SECTIONS.map((item, index) => (
            <PrivacySection
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === PRIVACY_SECTIONS.length - 1}
            />
          ))}
        </View>

        {/* ── Manage privacy CTA ── */}
        <SectionHeader title="Manage Your Privacy" />
        <View style={styles.sectionPadding}>
          <View style={styles.ctaCard}>
            <View style={styles.ctaIconWrap}>
              <Feather
                name="settings"
                size={22}
                color={AppColors.primary}
                strokeWidth={2}
              />
            </View>
            <Text style={styles.ctaTitle}>Take control of your data</Text>
            <Text style={styles.ctaSubtitle}>
              Adjust your privacy settings, secure your account, or reach out to our team
              for any concerns.
            </Text>

            <TouchableOpacity
              style={styles.ctaPrimaryBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/settings' as any)}
            >
              <Feather name="settings" size={16} color="white" strokeWidth={2} />
              <Text style={styles.ctaPrimaryBtnText}>Privacy Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ctaSecondaryBtn}
              activeOpacity={0.7}
              onPress={handleContactSupport}
            >
              <Feather name="shield" size={16} color={AppColors.primary} strokeWidth={2} />
              <Text style={styles.ctaSecondaryBtnText}>Account Security</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ctaSecondaryBtn}
              activeOpacity={0.7}
              onPress={handleContactSupport}
            >
              <Feather name="message-square" size={16} color={AppColors.primary} strokeWidth={2} />
              <Text style={styles.ctaSecondaryBtnText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom safe padding */}
        <View style={styles.bottomPad} />

        <SupportModal
          visible={supportModalVisible}
          onClose={() => setSupportModalVisible(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  // Hero
  hero: {
    paddingHorizontal: layoutPadding,
    paddingTop: 10,
    paddingBottom: 8,
  },
  heroTitle: {
    ...Typography.discoverTitle,
    color: AppColors.text,
  },
  heroSubtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    marginTop: 4,
    lineHeight: 22,
  },
  lastUpdatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  lastUpdatedText: {
    ...Typography.meta,
    color: AppColors.iconMuted,
  },

  // Shared section padding
  sectionPadding: {
    paddingHorizontal: layoutPadding,
  },

  // Highlights
  highlightsWrap: {
    paddingHorizontal: layoutPadding,
    gap: 10,
    paddingTop: 16,
  },
  highlightItem: {
    // full width — each card on its own row
  },

  // Accordion container
  accordionWrap: {
    marginHorizontal: layoutPadding,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: AppColors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },

  // CTA card
  ctaCard: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  ctaIconWrap: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: `${AppColors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  ctaTitle: {
    ...Typography.sectionTitle,
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  ctaPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: 24,
    width: '100%',
    gap: 8,
    marginBottom: 10,
  },
  ctaPrimaryBtnText: {
    ...Typography.bodySemibold,
    color: 'white',
    fontSize: 15,
  },
  ctaSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${AppColors.primary}10`,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    gap: 8,
    marginBottom: 10,
  },
  ctaSecondaryBtnText: {
    ...Typography.bodySemibold,
    color: AppColors.primary,
    fontSize: 15,
  },

  bottomPad: {
    height: 40,
  },
});
