import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Story } from '../data/mockData';
import { useRouter } from 'expo-router';
import { AppColors, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';

interface StoryBarProps {
  stories: Story[];
  onAddStory?: () => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({ stories, onAddStory }) => {
  const router = useRouter();

  const handleStoryPress = (story: Story) => {
    router.push(`/story/${story.id}` as any);
  };

  const handleAddStory = () => {
    if (onAddStory) onAddStory();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity style={styles.addStoryItem} onPress={handleAddStory} activeOpacity={0.8}>
          <View style={styles.addStoryCircle}>
            <Feather name="plus" size={26} color={AppColors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.addStoryText}>Add story</Text>
        </TouchableOpacity>

        {stories.map((story) => (
          <TouchableOpacity
            key={story.id}
            onPress={() => handleStoryPress(story)}
            style={styles.storyItem}
          >
            <Avatar
              user={story.user}
              size="story"
              showBorder
              isViewed={story.isViewed}
            />
            <Text style={styles.storyUsername} numberOfLines={1}>
              {story.user.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  /** Outer wrapper only — no chrome so stories sit on the screen background */
  container: {
    backgroundColor: 'transparent',
  },
  scrollView: {
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
  },
  addStoryItem: {
    alignItems: 'center',
    marginRight: 14,
    width: 64,
  },
  addStoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.surfaceElevated,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStoryText: {
    ...Typography.meta,
    marginTop: 4,
    color: AppColors.text,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 14,
    width: 64,
  },
  storyUsername: {
    ...Typography.meta,
    marginTop: 3,
    color: AppColors.text,
  },
});
