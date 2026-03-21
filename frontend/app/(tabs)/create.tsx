import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { AppColors } from '../../constants/theme';

export default function CreateScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { createPost } = useApp();
  const router = useRouter();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setIsPosting(true);
    try {
      await createPost(selectedImage, caption);
      Alert.alert('Success', 'Post has been published!', [
        {
          text: 'OK',
          onPress: () => {
            setSelectedImage(null);
            setCaption('');
            router.push('/(tabs)/home' as any);
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to post, please try again');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!selectedImage || isPosting}
        >
          <Text
            style={[
              styles.postButton,
              (!selectedImage || isPosting) && styles.postButtonDisabled,
            ]}
          >
            {isPosting ? 'Posting...' : 'Share'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {selectedImage ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={pickImage}
            >
              <Feather name="edit-2" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.selectImageContainer} onPress={pickImage}>
            <Feather name="plus" size={48} color="#8e8e8e" />
            <Text style={styles.selectImageText}>Select Image</Text>
          </TouchableOpacity>
        )}

        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor={AppColors.textMuted}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2200}
          />
          <Text style={styles.charCount}>{caption.length}/2200</Text>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  postButton: {
    color: AppColors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  postButtonDisabled: {
    color: AppColors.textMuted,
  },
  content: {
    flex: 1,
  },
  previewContainer: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  selectImageContainer: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  selectImageText: {
    marginTop: 12,
    color: AppColors.textSecondary,
    fontSize: 16,
  },
  captionContainer: {
    padding: 16,
  },
  captionInput: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: AppColors.text,
  },
  charCount: {
    textAlign: 'right',
    color: AppColors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
});
