import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { AppColors, borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { Avatar } from '../../components/Avatar';
import { Toast } from '../../components/Toast';

type CreateType = 'post' | 'reels';

const CAPTION_MAX = 2200;

function OptionRow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.optionRow,
        disabled && styles.optionRowDisabled,
        pressed && !disabled && styles.optionRowPressed,
      ]}
    >
      <View style={[styles.optionIconWrap, disabled && styles.optionIconWrapDisabled]}>
        <Feather
          name={icon}
          size={18}
          color={disabled ? AppColors.iconMuted : AppColors.textSecondary}
          strokeWidth={2}
        />
      </View>
      <Text style={[styles.optionLabel, disabled && styles.optionLabelDisabled]}>{label}</Text>
      <Feather name="chevron-right" size={18} color={AppColors.iconMuted} strokeWidth={2} />
    </Pressable>
  );
}

export default function CreateScreen() {
  const [createType, setCreateType] = React.useState<CreateType>('post');
  const [selectedMedia, setSelectedMedia] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState('');
  const [isPosting, setIsPosting] = React.useState(false);
  const [toastVisible, setToastVisible] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
  const { createPost, currentUser } = useApp();
  const router = useRouter();

  const tabAnim = useSharedValue(createType === 'post' ? 0 : 1);

  useEffect(() => {
    tabAnim.value = withSpring(createType === 'post' ? 0 : 1, {
      damping: 18,
      stiffness: 220,
    });
  }, [createType]);

  const postTabStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      tabAnim.value,
      [0, 1],
      [AppColors.surface, 'rgba(255,255,255,0)'],
    );
    return { backgroundColor };
  });

  const reelsTabStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      tabAnim.value,
      [0, 1],
      ['rgba(255,255,255,0)', AppColors.surface],
    );
    return { backgroundColor };
  });

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: createType === 'reels' ? [9, 16] : [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedMedia(result.assets[0].uri);
    }
  };

  const pickVideo = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedMedia(result.assets[0].uri);
    }
  };

  const handleMediaPick = async () => {
    if (createType === 'post') {
      await pickImage();
    } else {
      await pickVideo();
    }
  };

  const handlePost = async () => {
    if (!selectedMedia) {
      setToastType('error');
      setToastMessage('Please select a photo or video before sharing.');
      setToastVisible(true);
      return;
    }

    setIsPosting(true);
    try {
      await createPost(selectedMedia, caption);
      setToastType('success');
      setToastMessage(
        createType === 'reels'
          ? 'Your reel has been published!'
          : 'Your post has been published!'
      );
      setToastVisible(true);
      setSelectedMedia(null);
      setCaption('');
      setTimeout(() => {
        router.push('/(tabs)/home');
      }, 1200);
    } catch {
      setToastType('error');
      setToastMessage('Failed to post. Please try again.');
      setToastVisible(true);
    } finally {
      setIsPosting(false);
    }
  };

  const switchType = (t: CreateType) => {
    if (t !== createType) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setCreateType(t);
      setSelectedMedia(null);
    }
  };

  const typeLabel = createType === 'reels' ? 'Reels' : 'Post';
  const shareReady = !!selectedMedia && !isPosting;
  const optionsDisabled = !selectedMedia;

  const mockOption = (title: string) => () =>
    Alert.alert(title, 'This option will be available in a future update.');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Refined Post / Reels segmented control */}
      <View style={styles.topSection}>
        <View style={styles.segmentTrack}>
          <Animated.View style={[styles.segmentTab, postTabStyle]}>
            <Pressable
              onPress={() => switchType('post')}
              style={styles.segmentTabInner}
            >
              <Feather
                name="grid"
                size={17}
                color={createType === 'post' ? AppColors.primary : AppColors.iconMuted}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  createType === 'post' && styles.segmentLabelActive,
                ]}
              >
                Post
              </Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={[styles.segmentTab, reelsTabStyle]}>
            <Pressable
              onPress={() => switchType('reels')}
              style={styles.segmentTabInner}
            >
              <Feather
                name="video"
                size={17}
                color={createType === 'reels' ? AppColors.primary : AppColors.iconMuted}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  createType === 'reels' && styles.segmentLabelActive,
                ]}
              >
                Reels
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Title row: avatar + headline + Share (aligned) */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile' as any)}
            activeOpacity={0.85}
            style={styles.avatarBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {currentUser ? (
              <Avatar user={currentUser} size="small" />
            ) : (
              <View style={styles.avatarFallback}>
                <Feather name="user" size={18} color={AppColors.iconMuted} strokeWidth={2} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>New {typeLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={handlePost}
            disabled={!shareReady}
            activeOpacity={0.7}
            style={styles.shareBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.shareLabel, !shareReady && styles.shareLabelDisabled]}>
              {isPosting ? 'Sharing…' : 'Share'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Media: empty state or preview */}
        {!selectedMedia ? (
          <Animated.View
            key={`empty-${createType}`}
            entering={FadeIn.duration(260)}
            exiting={FadeOut.duration(160)}
            style={styles.mediaAnimWrap}
          >
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={handleMediaPick}
              style={[
                styles.mediaCard,
                createType === 'reels' ? styles.mediaCardReels : styles.mediaCardPost,
              ]}
            >
              <LinearGradient
                colors={['#F3EEEA', '#EDE7E0', '#F7F5F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.mediaCardInner}>
                <View style={styles.mediaIconRing}>
                  <Feather
                    name={createType === 'reels' ? 'video' : 'plus'}
                    size={createType === 'reels' ? 36 : 34}
                    color={AppColors.iconMuted}
                    strokeWidth={1.6}
                  />
                </View>
                <Text style={styles.mediaPrimaryLabel}>
                  {createType === 'reels' ? 'Select video' : 'Select image'}
                </Text>
                <Text style={styles.mediaInstruction}>
                  Take a photo, record, or choose from your gallery
                </Text>
                {createType === 'reels' && (
                  <Text style={styles.mediaHint}>Vertical 9:16 works best for Reels</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            key="preview-media"
            entering={FadeIn.duration(280)}
            exiting={FadeOut.duration(180)}
            style={styles.mediaAnimWrap}
          >
            <View
              style={[
                styles.previewShell,
                createType === 'reels' ? styles.previewShellReels : styles.previewShellPost,
              ]}
            >
              <Image
                source={{ uri: selectedMedia }}
                style={[
                  styles.previewImage,
                  createType === 'reels' ? styles.previewImageReels : styles.previewImagePost,
                ]}
                contentFit="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(45,55,72,0.35)']}
                style={styles.previewGradient}
              />
              <TouchableOpacity style={styles.changeMediaFab} onPress={handleMediaPick} activeOpacity={0.9}>
                <Feather name="edit-2" size={18} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
              {createType === 'reels' && (
                <View style={styles.reelsPill}>
                  <Feather name="video" size={13} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.reelsPillText}>Reels</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Caption */}
        <View style={styles.captionSection}>
          <View style={styles.captionDivider} />
          <TextInput
            style={styles.captionInput}
            placeholder={
              createType === 'reels'
                ? 'Write a caption for your reel…'
                : 'Write a caption…'
            }
            placeholderTextColor={AppColors.iconMuted}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={CAPTION_MAX}
          />
          <Text style={styles.charCount}>
            {caption.length}/{CAPTION_MAX}
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsSection}>
          <Text style={styles.optionsHeading}>More options</Text>
          <View style={styles.optionsCard}>
            <OptionRow
              icon="user-plus"
              label="Tag people"
              disabled={optionsDisabled}
              onPress={mockOption('Tag people')}
            />
            <View style={styles.optionSeparator} />
            <OptionRow
              icon="map-pin"
              label="Add location"
              disabled={optionsDisabled}
              onPress={mockOption('Location')}
            />
            <View style={styles.optionSeparator} />
            <OptionRow
              icon="hash"
              label="Add topics"
              disabled={optionsDisabled}
              onPress={mockOption('Topics')}
            />
            {createType === 'reels' && (
              <>
                <View style={styles.optionSeparator} />
                <OptionRow
                  icon="music"
                  label="Add music"
                  disabled={optionsDisabled}
                  onPress={mockOption('Music')}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  topSection: {
    paddingHorizontal: layoutPadding,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: AppColors.background,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: AppColors.borderLight,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    borderRadius: 11,
    overflow: 'hidden',
  },
  segmentTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  segmentLabel: {
    ...Typography.bodySemibold,
    fontSize: 14,
    color: AppColors.iconMuted,
  },
  segmentLabelActive: {
    color: AppColors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    minHeight: 44,
  },
  avatarBtn: {
    marginRight: 12,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.border,
  },
  headerTitleBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.screenTitle,
    fontSize: 18,
    color: AppColors.text,
  },
  shareBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  shareLabel: {
    ...Typography.bodySemibold,
    fontSize: 16,
    color: AppColors.primary,
  },
  shareLabelDisabled: {
    color: AppColors.iconMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  mediaAnimWrap: {
    paddingHorizontal: layoutPadding,
    marginTop: 4,
  },
  mediaCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  mediaCardPost: {
    aspectRatio: 1,
    maxHeight: 360,
  },
  mediaCardReels: {
    aspectRatio: 9 / 16,
    maxHeight: 420,
  },
  mediaCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  mediaIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: `${AppColors.iconMuted}55`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  mediaPrimaryLabel: {
    ...Typography.sectionTitle,
    fontSize: 17,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  mediaInstruction: {
    ...Typography.caption,
    color: AppColors.iconMuted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  mediaHint: {
    ...Typography.meta,
    fontSize: 11,
    color: AppColors.iconMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  previewShell: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: AppColors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  previewShellPost: {},
  previewShellReels: {
    maxHeight: 440,
  },
  previewImage: {
    width: '100%',
  },
  previewImagePost: {
    aspectRatio: 1,
  },
  previewImageReels: {
    aspectRatio: 9 / 16,
  },
  previewGradient: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  changeMediaFab: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelsPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  reelsPillText: {
    ...Typography.meta,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  captionSection: {
    marginTop: 20,
    paddingHorizontal: layoutPadding,
  },
  captionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.border,
    marginBottom: 14,
  },
  captionInput: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 108,
    textAlignVertical: 'top',
    color: AppColors.text,
    letterSpacing: -0.2,
    padding: 0,
  },
  charCount: {
    ...Typography.meta,
    fontSize: 11,
    color: AppColors.iconMuted,
    textAlign: 'right',
    marginTop: 10,
    letterSpacing: 0.3,
  },
  optionsSection: {
    marginTop: 28,
    paddingHorizontal: layoutPadding,
  },
  optionsHeading: {
    ...Typography.meta,
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.iconMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  optionsCard: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.border,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: AppColors.surface,
  },
  optionRowDisabled: {
    opacity: 0.55,
  },
  optionRowPressed: {
    backgroundColor: AppColors.borderLight,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionIconWrapDisabled: {
    backgroundColor: AppColors.background,
  },
  optionLabel: {
    ...Typography.bodyMedium,
    flex: 1,
    color: AppColors.text,
  },
  optionLabelDisabled: {
    color: AppColors.iconMuted,
  },
  optionSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.borderLight,
    marginLeft: 62,
  },
});
