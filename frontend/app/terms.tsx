/**
 * TermsOfServiceScreen — modern, polished legal screen for a social media app.
 *
 * Architecture:
 * - CompactHeader: matches all other screen headers in the app (help, settings, etc.)
 * - Hero block: title + subtitle + last-updated date — clean, not legal-heavy
 * - Summary card: InfoCard with "summary" variant — quick overview before scrolling
 * - Accordion sections: TermsSection components with smooth expand/collapse
 * - Warning notice: InfoCard with "warning" variant for important callouts
 * - Contact section: CTA card with support button
 *
 * Design rationale:
 * - Accordion UI keeps the page scannable — users tap what interests them
 * - Summary card at top reduces anxiety before diving into full terms
 * - Warning card breaks up the dense text with visual emphasis
 * - Contact CTA gives users an escape valve instead of feeling trapped by legal text
 * - All colors from AppColors palette; all spacing from layoutPadding / borderRadius
 * - LayoutAnimation (UI thread) for accordion — zero JS re-render cost on scroll
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CompactHeader } from '../components/StaticPremiumHeader';
import { TermsSection, type TermsSectionData } from '../components/help/TermsSection';
import { InfoCard } from '../components/help/InfoCard';
import { SectionHeader } from '../components/help/SectionHeader';
import { SupportModal } from '../components/contact';
import { AppColors, borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';

// ─── Static data ───────────────────────────────────────────────────────────────

const TERMS_DATA: TermsSectionData[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content:
      'By downloading, installing, or using UITVibes, you agree to be bound by these Terms of Service and our Community Guidelines. If you do not agree to these terms, please do not use the app. Your continued use of the platform constitutes acceptance of any updates or changes to these terms.',
  },
  {
    id: 'responsibilities',
    title: 'User Responsibilities',
    content:
      'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to use the app only for lawful purposes and in accordance with these terms. You must not misuse the platform, attempt unauthorized access, or interfere with the proper functioning of the service.',
  },
  {
    id: 'guidelines',
    title: 'Community Guidelines',
    content:
      'UITVibes is a community-first platform. Treat all members with respect. Harassment, hate speech, bullying, and threatening behavior are strictly prohibited. We encourage constructive conversations and positive interactions. Content that promotes violence, self-harm, or illegal activities will be removed immediately.',
  },
  {
    id: 'content',
    title: 'Content Ownership',
    content:
      'You retain ownership of all content you create and post on UITVibes. By posting content, you grant us a non-exclusive, royalty-free, worldwide license to use, reproduce, modify, and distribute your content on the platform and in related marketing materials. You represent that you own or have the rights to the content you post.',
  },
  {
    id: 'privacy',
    title: 'Privacy & Data Usage',
    content:
      'Your privacy matters to us. We collect, use, and protect your data as described in our Privacy Policy. This includes account information, usage data, and content you share. We may share certain data with third-party service providers to deliver core app functionality. You can manage your privacy settings at any time.',
  },
  {
    id: 'prohibited',
    title: 'Prohibited Activities',
    content:
      'The following activities are not allowed: posting spam, promotional content without permission, or copyrighted material you do not own; creating fake accounts or misrepresenting your identity; using the app to distribute malware or engage in hacking; sharing sexually explicit, violent, or graphic content; and any activity that violates applicable laws or regulations.',
  },
  {
    id: 'suspension',
    title: 'Account Suspension',
    content:
      'We reserve the right to suspend or terminate your account if you violate these terms or our Community Guidelines. Repeat violations may result in a permanent ban. We may also restrict access to certain features without prior notice. Users who believe their account was suspended in error may contact our support team for review.',
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content:
      'UITVibes and its operators are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. We do not guarantee uninterrupted access to the service and reserve the right to modify, suspend, or discontinue features at any time. Your use of the platform is at your own risk.',
  },
  {
    id: 'changes',
    title: 'Changes to Terms',
    content:
      'We may update these terms from time to time to reflect changes in our practices, features, or legal requirements. We will notify users of significant changes via in-app announcements or email. Continued use of the app after any changes constitutes acceptance of the revised terms. We encourage you to review this page periodically.',
  },
  {
    id: 'contact',
    title: 'Contact Information',
    content:
      'If you have any questions, concerns, or requests regarding these Terms of Service, please reach out to our support team through the app or email us at support@uitvibes.com. For privacy-specific inquiries, please contact our Data Protection team. We aim to respond to all inquiries within 3–5 business days.',
  },
];

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const handleContactSupport = () => {
    setSupportModalVisible(true);
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@uitvibes.com');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <CompactHeader
        title="Terms of Service"
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
          <Text style={styles.heroTitle}>Legal Agreements</Text>
          <Text style={styles.heroSubtitle}>
            Please review the terms for using our platform.
          </Text>
          <View style={styles.lastUpdatedRow}>
            <Feather name="clock" size={13} color={AppColors.iconMuted} strokeWidth={2} />
            <Text style={styles.lastUpdatedText}>Last updated: May 17, 2026</Text>
          </View>
        </View>

        {/* ── Summary card ── */}
        <View style={styles.sectionPadding}>
          <InfoCard variant="summary" icon="book-open" title="Quick Summary">
            This app provides a platform for sharing content, connecting with others, and engaging
            with the community. By using the app, you agree to follow our rules and policies.
          </InfoCard>
        </View>

        {/* ── Terms sections ── */}
        <SectionHeader title="Terms" />
        <View style={styles.accordionWrap}>
          {TERMS_DATA.map((item, index) => (
            <TermsSection
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === TERMS_DATA.length - 1}
            />
          ))}
        </View>

        {/* ── Warning notice ── */}
        <View style={styles.sectionPadding}>
          <InfoCard variant="warning" icon="alert-triangle" title="Important Notice">
            Violation of community rules may result in content removal or account suspension.
            Repeated violations may lead to permanent account termination.
          </InfoCard>
        </View>

        {/* ── Support section ── */}
        <SectionHeader title="Support" />
        <View style={styles.sectionPadding}>
          <View style={styles.supportCard}>
            <View style={styles.supportIconWrap}>
              <Feather
                name="headphones"
                size={22}
                color={AppColors.primary}
                strokeWidth={2}
              />
            </View>
            <Text style={styles.supportTitle}>Questions about our Terms?</Text>
            <Text style={styles.supportSubtitle}>
              Our support team is here to help. Reach out and we'll get back to you shortly.
            </Text>

            <TouchableOpacity
              style={styles.supportPrimaryBtn}
              activeOpacity={0.8}
              onPress={handleContactSupport}
            >
              <Feather name="message-square" size={16} color="white" strokeWidth={2} />
              <Text style={styles.supportPrimaryBtnText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportSecondaryBtn}
              activeOpacity={0.7}
              onPress={handleEmailSupport}
            >
              <Feather name="mail" size={16} color={AppColors.primary} strokeWidth={2} />
              <Text style={styles.supportSecondaryBtnText}>support@uitvibes.com</Text>
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

  // Shared section padding (horizontal)
  sectionPadding: {
    paddingHorizontal: layoutPadding,
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

  // Support card
  supportCard: {
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
  supportIconWrap: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: `${AppColors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  supportTitle: {
    ...Typography.sectionTitle,
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  supportSubtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  supportPrimaryBtn: {
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
  supportPrimaryBtnText: {
    ...Typography.bodySemibold,
    color: 'white',
    fontSize: 15,
  },
  supportSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${AppColors.primary}10`,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    gap: 8,
  },
  supportSecondaryBtnText: {
    ...Typography.bodySemibold,
    color: AppColors.primary,
    fontSize: 15,
  },

  bottomPad: {
    height: 40,
  },
});
