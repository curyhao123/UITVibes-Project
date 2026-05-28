/**
 * HelpCenterScreen — polished social-media-style support page.
 *
 * Features:
 * 1. Header (ScreenHeader) with title + subtitle
 * 2. Search bar with local topic filtering
 * 3. Quick-action support cards (Report, Contact, Guidelines, Safety, Security)
 * 4. Animated FAQ accordion
 * 5. "Still need help?" contact card
 *
 * All sections are data-driven and easy to extend.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../components/ScreenHeader';
import { CompactHeader } from '../components/StaticPremiumHeader';
import { HelpCard, FAQItem, SectionHeader } from '../components/help';
import { SupportModal } from '../components/contact';
import { AppColors, borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';

// ─── Static data ───────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    id: 'report',
    icon: 'alert-triangle',
    title: 'Report a Problem',
    description: 'Let us know if something is wrong',
    action: () => {},
  },
  {
    id: 'contact',
    icon: 'message-circle',
    title: 'Contact Support',
    description: 'Chat with our support team',
    action: () => setSupportModalVisible(true),
  },
  {
    id: 'guidelines',
    icon: 'book-open',
    title: 'Community Guidelines',
    description: 'Learn what is allowed on UITVibes',
    action: () => {},
  },
  {
    id: 'safety',
    icon: 'shield',
    title: 'Safety & Privacy',
    description: 'Control your privacy and safety settings',
    action: () => {},
  },
  {
    id: 'security',
    icon: 'lock',
    title: 'Account & Security',
    description: 'Manage your account security',
    action: () => {},
  },
];

const FAQ_DATA = [
  {
    id: 'faq-1',
    question: 'How do I reset my password?',
    answer:
      'Go to the login screen and tap "Forgot Password". Enter your email address and we\'ll send you a one-time code to reset your password securely.',
  },
  {
    id: 'faq-2',
    question: "Why can't I upload a post?",
    answer:
      'Make sure you have a stable internet connection and the file size is under 100 MB. Supported formats include JPG, PNG, and MP4. If the issue persists, try restarting the app.',
  },
  {
    id: 'faq-3',
    question: 'How do I change my privacy settings?',
    answer:
      'Open Settings → Account → Privacy & Security. From there you can toggle your account to private, control who can see your posts, and manage story visibility.',
  },
  {
    id: 'faq-4',
    question: "Why am I not receiving notifications?",
    answer:
      'Check that notifications are enabled in your device settings. On iOS, go to Settings → Notifications → UITVibes. On Android, go to Settings → Apps → UITVibes → Notifications.',
  },
  {
    id: 'faq-5',
    question: 'How do I report a user?',
    answer:
      'Visit the user\'s profile, tap the menu (⋯) in the top right, and select "Report". Choose a reason and optionally add details. Our team will review it within 24 hours.',
  },
];

// ─── Search Bar ────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={searchStyles.wrap}>
      <View style={searchStyles.inputRow}>
        <Feather
          name="search"
          size={17}
          color={AppColors.iconMuted}
          strokeWidth={2}
          style={searchStyles.searchIcon}
        />
        <TextInput
          style={searchStyles.input}
          placeholder="Search help topics"
          placeholderTextColor={AppColors.iconMuted}
          value={value}
          onChangeText={onChange}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={AppColors.iconMuted} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── FAQ Item with index props ─────────────────────────────────────────────────

function FAQItemWithIndex({ item, index, total }: { item: typeof FAQ_DATA[0]; index: number; total: number }) {
  return (
    <FAQItem
      item={item}
      isFirst={index === 0}
      isLast={index === total - 1}
    />
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function HelpCenterScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  // Filter topics based on search query
  const filteredTopics = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();
    return FAQ_DATA.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q),
    );
  }, [query]);

  // Close keyboard on scroll
  const onScrollBeginDrag = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CompactHeader
        title="Help Center"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={onScrollBeginDrag}
      >
        {/* Hero subtitle */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Find answers</Text>
          <Text style={styles.heroSubtitle}>Get the help you need, when you need it</Text>
        </View>

        {/* Search */}
        <SearchBar value={query} onChange={setQuery} />

        {/* ── Quick Actions ── */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.cardWrap}>
          {QUICK_ACTIONS.map((card, index) => (
            <HelpCard
              key={card.id}
              card={card}
              isFirst={index === 0}
              isLast={index === QUICK_ACTIONS.length - 1}
            />
          ))}
        </View>

        {/* ── FAQs ── */}
        <SectionHeader
          title="Frequently Asked Questions"
          subtitle="Tap a question to expand the answer"
        />

        {/* Search results OR all FAQs */}
        {filteredTopics !== null ? (
          filteredTopics.length > 0 ? (
            <View style={styles.cardWrap}>
              {filteredTopics.map((item, index) => (
                <FAQItemWithIndex
                  key={item.id}
                  item={item}
                  index={index}
                  total={filteredTopics.length}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptySearch}>
              <Feather name="search" size={32} color={AppColors.border} strokeWidth={1.5} />
              <Text style={styles.emptySearchTitle}>No results found</Text>
              <Text style={styles.emptySearchSub}>
                Try a different keyword like "password", "privacy", or "notification"
              </Text>
            </View>
          )
        ) : (
          <View style={styles.cardWrap}>
            {FAQ_DATA.map((item, index) => (
              <FAQItemWithIndex
                key={item.id}
                item={item}
                index={index}
                total={FAQ_DATA.length}
              />
            ))}
          </View>
        )}

        {/* ── Still need help? ── */}
        <View style={styles.ctaWrap}>
          <View style={styles.ctaCard}>
            <View style={styles.ctaIconWrap}>
              <Feather name="headphones" size={22} color={AppColors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.ctaTitle}>Still need help?</Text>
            <Text style={styles.ctaSubtitle}>
              Our support team is here for you. Send us a message and we'll get back to you shortly.
            </Text>

            <TouchableOpacity
              style={styles.ctaPrimaryBtn}
              activeOpacity={0.8}
              onPress={() => setSupportModalVisible(true)}
            >
              <Feather name="message-square" size={16} color="white" strokeWidth={2} />
              <Text style={styles.ctaPrimaryBtnText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ctaSecondaryBtn}
              activeOpacity={0.7}
              onPress={() => {}}
            >
              <Feather name="edit-3" size={16} color={AppColors.primary} strokeWidth={2} />
              <Text style={styles.ctaSecondaryBtnText}>Send Feedback</Text>
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

const searchStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layoutPadding,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 10,
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: AppColors.text,
    letterSpacing: -0.15,
    padding: 0,
  },
});

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
  hero: {
    paddingHorizontal: layoutPadding,
    paddingTop: 12,
    paddingBottom: 18,
  },
  heroTitle: {
    ...Typography.discoverTitle,
    color: AppColors.text,
  },
  heroSubtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    marginTop: 4,
  },
  cardWrap: {
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
  emptySearch: {
    marginHorizontal: layoutPadding,
    borderRadius: borderRadius.md,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptySearchTitle: {
    ...Typography.bodySemibold,
    color: AppColors.text,
    marginTop: 8,
  },
  emptySearchSub: {
    ...Typography.caption,
    color: AppColors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  ctaWrap: {
    paddingHorizontal: layoutPadding,
    paddingTop: 12,
  },
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
