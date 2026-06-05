import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
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
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { AppColors, borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { Avatar } from '../../components/Avatar';
import { Toast } from '../../components/Toast';
import { MentionInput } from '../../components/MentionInput';
import {
  ContentVisibility,
  contentVisibilityToApiValue,
  getDefaultContentVisibility,
} from '../../services/contentPreferences';

type CreateType = 'post' | 'reels';

export type PostVisibility = ContentVisibility;

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: React.ComponentProps<typeof Feather>['name']; description: string }[] = [
  { value: 'Public', label: 'Public', icon: 'globe', description: 'Anyone can see your post' },
  { value: 'Followers', label: 'Followers', icon: 'users', description: 'Only followers can see' },
  { value: 'Private', label: 'Private', icon: 'lock', description: 'Only mentioned users can see' },
];

const CAPTION_MAX = 2200;
type AspectRatioKey = '9:16' | '1:1' | '16:9' | '4:5';

const ASPECT_RATIO_OPTIONS: {
  key: AspectRatioKey;
  label: string;
  icon: string;
  ratio: number;
}[] = [
  { key: '9:16', label: '9:16', icon: 'smartphone', ratio: 9 / 16 },
  { key: '4:5',  label: '4:5',  icon: 'image',      ratio: 4 / 5  },
  { key: '1:1',  label: '1:1',  icon: 'square',     ratio: 1      },
  { key: '16:9', label: '16:9', icon: 'monitor',    ratio: 16 / 9 },
];

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
  const [selectedMedia, setSelectedMedia] = React.useState<string[]>([]);
  const [caption, setCaption] = React.useState('');
  const [isPosting, setIsPosting] = React.useState(false);
  const [toastVisible, setToastVisible] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
  const [selectedVisibility, setSelectedVisibility] = React.useState<PostVisibility>('Public');
  const [selectedAspectRatio, setSelectedAspectRatio] = React.useState<AspectRatioKey>('9:16');
  const [showVisibilityPicker, setShowVisibilityPicker] = React.useState(false);
  const { createPost, createReel, currentUser } = useApp();
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

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const preferenceType = createType === 'reels' ? 'reels' : 'post';

      void getDefaultContentVisibility(preferenceType)
        .then((visibility) => {
          if (active) {
            setSelectedVisibility(visibility);
          }
        })
        .catch((error) => {
          console.warn('Failed to load default content visibility:', error);
        });

      return () => {
        active = false;
      };
    }, [createType]),
  );

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      aspect: createType === 'reels' ? [9, 16] : [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      setSelectedMedia((prev) => {
        const combined = [...prev, ...newUris].slice(0, 10);
        return combined;
      });
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
      const fileSize = result.assets[0].fileSize;
      const maxSize = 100 * 1024 * 1024; // 100MB in bytes

      if (fileSize && fileSize > maxSize) {
        setToastType('error');
        setToastMessage('The file you selected is too large. The maximum size is 100MB.');
        setToastVisible(true);
        return;
      }

      setSelectedMedia((prev) => [result.assets[0].uri]);
    }
  };

  const handleMediaPick = async () => {
    if (createType === 'post') {
      await pickImage();
    } else {
      await pickVideo();
    }
  };

  const handleRemoveMedia = (index: number) => {
    setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (selectedMedia.length === 0) {
      setToastType('error');
      setToastMessage('Please select a photo or video before sharing.');
      setToastVisible(true);
      return;
    }

    if (!caption.trim()) {
      setToastType('error');
      setToastMessage('Caption is required.');
      setToastVisible(true);
      return;
    }

    setIsPosting(true);
    try {
      if (createType === 'reels') {
        await createReel(selectedMedia[0], caption);
        setToastType('success');
        setToastMessage('Your reel has been published!');
      } else {
        const visibilityValue = contentVisibilityToApiValue(selectedVisibility);
        await createPost(selectedMedia, caption, undefined, visibilityValue);
        setToastType('success');
        setToastMessage('Your post has been published!');
      }
      setToastVisible(true);
      setSelectedMedia([]);
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
      setSelectedMedia([]);
      if (t === 'reels') setSelectedAspectRatio('9:16'); // reset về mặc định
    }
  };

  const typeLabel = createType === 'reels' ? 'Reels' : 'Post';
  const shareReady = selectedMedia.length > 0 && !!caption.trim() && !isPosting;

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

        {/* Header row: Close button (X) | Title | Share */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={22} color={AppColors.text} strokeWidth={2} />
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
        {/* Media: empty state, single preview (reels/video), or multi-image grid */}
        {!selectedMedia.length ? (
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
                  {createType === 'reels' ? 'Select video' : 'Select images'}
                </Text>
                <Text style={styles.mediaInstruction}>
                  Take a photo, record, or choose from your gallery
                </Text>
                {createType === 'reels' && (
                  <Text style={styles.mediaHint}>Vertical 9:16 works best for Reels</Text>
                )}
                {createType === 'post' && (
                  <Text style={styles.mediaHint}>Select up to 10 photos</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : createType === 'reels' ? (
  <Animated.View
    key="preview-media-reels"
    entering={FadeIn.duration(280)}
    exiting={FadeOut.duration(180)}
    style={styles.mediaAnimWrap}
  >
    {/* Aspect ratio selector */}
    <View style={styles.aspectRatioBar}>
      {ASPECT_RATIO_OPTIONS.map((option) => (
        <Pressable
          key={option.key}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            setSelectedAspectRatio(option.key);
          }}
          style={[
            styles.aspectRatioPill,
            selectedAspectRatio === option.key && styles.aspectRatioPillActive,
          ]}
        >
          <Feather
            name={option.icon as React.ComponentProps<typeof Feather>['name']}
            size={13}
            color={selectedAspectRatio === option.key ? AppColors.primary : AppColors.iconMuted}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.aspectRatioPillLabel,
              selectedAspectRatio === option.key && styles.aspectRatioPillLabelActive,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>

    {/* Video preview với tỉ lệ động */}
    <View style={[styles.previewShell, styles.previewShellReels]}>
      <Image
        source={{ uri: selectedMedia[0] }}
        style={[
          styles.previewImageReels,
          {
            aspectRatio:
              ASPECT_RATIO_OPTIONS.find((o) => o.key === selectedAspectRatio)?.ratio ?? 9 / 16,
          },
        ]}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(45,55,72,0.35)']}
        style={styles.previewGradient}
      />
      <TouchableOpacity
        style={styles.changeMediaFab}
        onPress={handleMediaPick}
        activeOpacity={0.9}
      >
        <Feather name="edit-2" size={18} color="#FFFFFF" strokeWidth={2} />
      </TouchableOpacity>
      <View style={styles.reelsPill}>
        <Feather name="video" size={13} color="#FFFFFF" strokeWidth={2} />
        <Text style={styles.reelsPillText}>Reels</Text>
      </View>
      {/* Badge hiển thị tỉ lệ hiện tại */}
      <View style={styles.aspectRatioBadge}>
        <Text style={styles.aspectRatioBadgeText}>{selectedAspectRatio}</Text>
      </View>
    </View>
  </Animated.View>
        ) : (
          <Animated.View
            key="preview-grid"
            entering={FadeIn.duration(280)}
            exiting={FadeOut.duration(180)}
            style={styles.mediaAnimWrap}
          >
            <View style={styles.mediaGridContainer}>
              <View style={styles.mediaGrid}>
                {selectedMedia.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.mediaGridItem}>
                    <Image
                      source={{ uri }}
                      style={[
                        styles.mediaGridImage,
                        selectedMedia.length === 1 && styles.mediaGridImageSingle,
                      ]}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => handleRemoveMedia(index)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather name="x" size={14} color="#FFFFFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                    {selectedMedia.length > 1 && (
                      <View style={styles.mediaIndexBadge}>
                        <Text style={styles.mediaIndexText}>{index + 1}</Text>
                      </View>
                    )}
                  </View>
                ))}
                {selectedMedia.length < 10 && (
                  <TouchableOpacity
                    style={[
                      styles.mediaGridItem,
                      styles.addMoreMediaBtn,
                      selectedMedia.length === 0 && styles.mediaGridImageSingle,
                    ]}
                    onPress={handleMediaPick}
                    activeOpacity={0.8}
                  >
                    <View style={styles.addMoreMediaInner}>
                      <Feather name="plus" size={28} color={AppColors.iconMuted} strokeWidth={1.5} />
                      <Text style={styles.addMoreMediaText}>Add more</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              {selectedMedia.length > 1 && (
                <TouchableOpacity
                  style={styles.changeMediaLink}
                  onPress={handleMediaPick}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeMediaLinkText}>
                    {selectedMedia.length} photo{selectedMedia.length > 1 ? 's' : ''} selected — tap to change
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Caption with @mention support */}
        <View style={styles.captionSection}>
          <View style={styles.captionDivider} />
          <MentionInput
            value={caption}
            onChangeText={setCaption}
            placeholder={
              createType === 'reels'
                ? 'Write a caption for your reel…'
                : 'Write a caption…'
            }
            multiline
            maxLength={CAPTION_MAX}
            style={styles.mentionInputWrapper}
            inputStyle={styles.captionInput}
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
              icon={selectedVisibility === 'Public' ? 'globe' : selectedVisibility === 'Followers' ? 'users' : 'lock'}
              label={`Visibility: ${selectedVisibility}`}
              disabled={false}
              onPress={() => setShowVisibilityPicker(true)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Visibility Picker Modal */}
      {showVisibilityPicker && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.visibilityOverlay}
        >
          <Pressable style={styles.visibilityBackdrop} onPress={() => setShowVisibilityPicker(false)} />
          <View style={styles.visibilityCard}>
            <View style={styles.visibilityHeader}>
              <Text style={styles.visibilityTitle}>Who can see your {createType === 'reels' ? 'reel' : 'post'}?</Text>
              <TouchableOpacity onPress={() => setShowVisibilityPicker(false)} style={styles.visibilityCloseBtn}>
                <Feather name="x" size={20} color={AppColors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {VISIBILITY_OPTIONS.map((option, index) => (
              <React.Fragment key={option.value}>
                {index > 0 && <View style={styles.visibilityOptionSeparator} />}
                <Pressable
                  style={[
                    styles.visibilityOption,
                    selectedVisibility === option.value && styles.visibilityOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedVisibility(option.value);
                    setShowVisibilityPicker(false);
                  }}
                >
                  <View style={[styles.visibilityIconWrap, selectedVisibility === option.value && styles.visibilityIconSelected]}>
                    <Feather
                      name={option.icon}
                      size={20}
                      color={selectedVisibility === option.value ? AppColors.primary : AppColors.textSecondary}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={styles.visibilityOptionText}>
                    <Text style={[styles.visibilityOptionLabel, selectedVisibility === option.value && styles.visibilityOptionLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.visibilityOptionDesc}>{option.description}</Text>
                  </View>
                  {selectedVisibility === option.value && (
                    <Feather name="check" size={20} color={AppColors.primary} strokeWidth={2.5} />
                  )}
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      )}

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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
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
  mediaGridContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: AppColors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.border,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mediaGridItem: {
    width: '50%',
    aspectRatio: 1,
    padding: 1,
    position: 'relative',
  },
  mediaGridImage: {
    flex: 1,
    borderRadius: 4,
  },
  mediaGridImageSingle: {
    borderRadius: borderRadius.lg - 2,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaIndexBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaIndexText: {
    ...Typography.meta,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addMoreMediaBtn: {
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  addMoreMediaInner: {
    alignItems: 'center',
    gap: 6,
  },
  addMoreMediaText: {
    ...Typography.meta,
    fontSize: 11,
    color: AppColors.iconMuted,
  },
  changeMediaLink: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.borderLight,
  },
  changeMediaLinkText: {
    ...Typography.meta,
    fontSize: 12,
    color: AppColors.primary,
    textAlign: 'center',
    fontWeight: '600',
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
  mentionInputWrapper: {
    minHeight: 108,
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
    backgroundColor: 'transparent',
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
  // Visibility Picker Modal
  visibilityOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  visibilityBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  visibilityCard: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: 8,
    width: '85%',
    maxWidth: 340,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  visibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
  },
  visibilityTitle: {
    ...Typography.sectionTitle,
    fontSize: 18,
    color: AppColors.text,
  },
  visibilityCloseBtn: {
    padding: 4,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  visibilityOptionSelected: {
    backgroundColor: `${AppColors.primary}10`,
  },
  visibilityOptionSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.borderLight,
    marginLeft: 72,
  },
  visibilityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  visibilityIconSelected: {
    backgroundColor: `${AppColors.primary}20`,
  },
  visibilityOptionText: {
    flex: 1,
  },
  visibilityOptionLabel: {
    ...Typography.bodyMedium,
    fontSize: 16,
    color: AppColors.text,
    marginBottom: 2,
  },
  visibilityOptionLabelSelected: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  visibilityOptionDesc: {
    ...Typography.meta,
    fontSize: 13,
    color: AppColors.iconMuted,
  },
  // Aspect ratio selector
  aspectRatioBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    justifyContent: 'center',
  },
  aspectRatioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.border,
  },
  aspectRatioPillActive: {
    backgroundColor: `${AppColors.primary}15`,
    borderColor: AppColors.primary,
  },
  aspectRatioPillLabel: {
    ...Typography.meta,
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.iconMuted,
  },
  aspectRatioPillLabelActive: {
    color: AppColors.primary,
  },
  aspectRatioBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aspectRatioBadgeText: {
    ...Typography.meta,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
