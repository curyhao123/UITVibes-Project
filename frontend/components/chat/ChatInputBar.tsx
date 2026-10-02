import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { PushButton } from '../PushButton';

export interface ChatInputBarProps {
  isChatBlocked: boolean;
  blockedNoticeTitle: string;
  blockedNoticeMessage: string;
  messageText: string;
  onChangeText: (text: string) => void;
  selectedImage: string | null;
  isUploadingImage: boolean;
  isLoadingMessages: boolean;
  insetsBottom: number;
  onPickImage: () => void;
  onRemoveImage: () => void;
  onSend: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  isChatBlocked,
  blockedNoticeTitle,
  blockedNoticeMessage,
  messageText,
  onChangeText,
  selectedImage,
  isUploadingImage,
  isLoadingMessages,
  insetsBottom,
  onPickImage,
  onRemoveImage,
  onSend,
}) => {
  if (isChatBlocked) {
    return (
      <View
        style={[
          styles.blockedInputNotice,
          { paddingBottom: Math.max(insetsBottom, 10) },
        ]}
      >
        <Feather name="slash" size={18} color={AppColors.textMuted} strokeWidth={2} />
        <View style={styles.blockedInputTextWrap}>
          <Text style={styles.blockedInputTitle}>{blockedNoticeTitle}</Text>
          <Text style={styles.blockedInputMessage}>{blockedNoticeMessage}</Text>
        </View>
      </View>
    );
  }

  const canSend = (messageText.trim().length > 0 || !!selectedImage) && !isLoadingMessages && !isUploadingImage;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      style={styles.keyboardAvoid}
    >
      {/* Image preview strip */}
      {selectedImage && (
        <View style={styles.imagePreviewStrip}>
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreviewThumb} resizeMode="cover" />
            <TouchableOpacity
              style={styles.imagePreviewRemove}
              onPress={onRemoveImage}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x-circle" size={22} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View
        style={[
          styles.inputContainer,
          { paddingBottom: Math.max(insetsBottom, 10) },
        ]}
      >
        <TextInput
          style={styles.messageInput}
          placeholder="Message..."
          placeholderTextColor={AppColors.iconMuted}
          value={messageText}
          onChangeText={onChangeText}
          multiline
          maxLength={4000}
        />
        {!selectedImage && (
          <TouchableOpacity
            onPress={onPickImage}
            style={styles.attachBtn}
            disabled={isUploadingImage}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isUploadingImage ? (
              <ActivityIndicator size="small" color={AppColors.primary} />
            ) : (
              <Feather
                name="camera"
                size={20}
                color={AppColors.iconMuted}
              />
            )}
          </TouchableOpacity>
        )}
        {canSend && (
          <View style={styles.sendBtnWrap}>
            <PushButton
              onPress={onSend}
              disabled={isLoadingMessages || isUploadingImage}
              loading={isUploadingImage}
              shadowColor="#1D4ED8"
              frontColor={AppColors.primary}
              frontTextColor="#FFFFFF"
              liftPx={3}
              borderRadius={18}
              contentStyle={styles.sendBtnContent}
            >
              <Feather name="send" size={17} color="#FFFFFF" strokeWidth={2.2} />
            </PushButton>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    // Wraps input so it sits flush against the keyboard
  },
  blockedInputNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: layoutPadding,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  blockedInputTextWrap: {
    flex: 1,
    gap: 2,
  },
  blockedInputTitle: {
    ...Typography.bodySemibold,
    color: AppColors.text,
  },
  blockedInputMessage: {
    ...Typography.caption,
    color: AppColors.textMuted,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: layoutPadding,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
    gap: 8,
  },
  attachBtn: {
    padding: 4,
    marginBottom: 4,
  },
  imagePreviewStrip: {
    paddingHorizontal: layoutPadding,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: AppColors.surfaceElevated,
  },
  imagePreviewContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreviewThumb: {
    width: '100%',
    height: '100%',
  },
  imagePreviewRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 11,
  },
  sendBtnWrap: {
    marginBottom: 2,
  },
  sendBtnContent: {
    width: 36,
    height: 36,
    minHeight: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageInput: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
    backgroundColor: AppColors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
});
