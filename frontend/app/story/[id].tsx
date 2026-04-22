/**
 * Story viewer screen.
 *
 * Fetches full story detail (all items) from BE on mount.
 * Tracks progress bars per item, tap left/right to navigate,
 * auto-advances and marks each item viewed when it completes.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { getStoryDetail, markStoryViewed, Story, StoryItem } from '../../services/storyService';
import defaultAvatar from '../../assets/images/default-avatar.png';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ITEM_DURATION_MS = 5_000; // 5 seconds per story item
const PROGRESS_TICK_MS  = 50;  // progress bar tick interval

export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [story, setStory] = useState<Story | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which items have been marked viewed
  const viewedItemIds = useRef<Set<string>>(new Set());

  // Progress timer
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  // Start progress for the current item
  const startProgress = useCallback(() => {
    clearTimer();
    setProgress(0);
    const item = story?.items?.[currentIndex];
    if (!item) return;

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) {
          clearTimer();
          return prev;
        }
        return prev + PROGRESS_TICK_MS / ITEM_DURATION_MS;
      });
    }, PROGRESS_TICK_MS);
  }, [clearTimer, story, currentIndex]);

  // Mark current item viewed (only once)
  const markCurrentViewed = useCallback(() => {
    const item = story?.items?.[currentIndex];
    if (!item || viewedItemIds.current.has(item.id)) return;
    viewedItemIds.current.add(item.id);
    void markStoryViewed(item.id);
  }, [story, currentIndex]);

  // Fetch story detail on mount
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getStoryDetail(id).then((s) => {
      if (cancelled) return;
      setLoading(false);
      if (!s) {
        setError('Story not found or has expired.');
        return;
      }
      setStory(s);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // When story is set, kick off progress
  useEffect(() => {
    if (!story) return;
    startProgress();
    return clearTimer;
  }, [story, currentIndex, startProgress, clearTimer]);

  // When progress completes an item, advance
  useEffect(() => {
    if (!story) return;
    const totalItems = story.items?.length ?? 0;
    if (progress < 1 || currentIndex >= totalItems) return;

    // Mark viewed then advance
    markCurrentViewed();

    if (currentIndex < totalItems - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      // Last item done — close viewer
      clearTimer();
      router.back();
    }
  }, [progress, currentIndex, story, markCurrentViewed, clearTimer, router]);

  const handleTap = (x: number) => {
    if (!story) return;
    const totalItems = story.items?.length ?? 0;
    if (x < SCREEN_WIDTH / 2) {
      // Tap left — go to previous
      if (currentIndex > 0) {
        markCurrentViewed();
        setCurrentIndex((i) => i - 1);
        setProgress(0);
      }
    } else {
      // Tap right — go to next
      if (currentIndex < totalItems - 1) {
        markCurrentViewed();
        setCurrentIndex((i) => i + 1);
        setProgress(0);
      } else {
        clearTimer();
        router.back();
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error || !story) {
    return (
      <SafeAreaView style={styles.centered}>
        <Feather name="alert-circle" size={48} color="rgba(255,255,255,0.6)" />
        <Text style={styles.errorText}>{error ?? 'Story not available'}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentItem = story.items?.[currentIndex] as StoryItem | undefined;
  const totalItems = story.items?.length ?? 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {Array.from({ length: totalItems }).map((_, i) => (
          <View key={i} style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    i < currentIndex
                      ? '100%'
                      : i === currentIndex
                      ? `${Math.min(progress * 100, 100)}%`
                      : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={story.avatar ? { uri: story.avatar } : defaultAvatar}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.username}>{story.displayName}</Text>
            {totalItems > 1 && (
              <Text style={styles.itemCount}>
                {currentIndex + 1} / {totalItems}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.xBtn}>
          <Feather name="x" size={24} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Media content */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.mediaContainer}
        onPress={(e) => handleTap(e.nativeEvent.locationX)}
      >
        {currentItem ? (
          <Image
            source={{ uri: currentItem.url }}
            style={styles.media}
            contentFit="cover"
            transition={200}
          />
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 50,
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#333',
  },
  username: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  itemCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 1,
  },
  xBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    flex: 1,
  },
  media: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
});
