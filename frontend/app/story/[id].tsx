import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { mockStories } from '../../data/mockData';
import { Story } from '../../data/mockData';

const { width, height } = Dimensions.get('window');

export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams();
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const story = mockStories.find((s) => s.id === id);
    setCurrentStory(story || null);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [id]);

  useEffect(() => {
    if (currentStory && currentImageIndex < currentStory.images.length) {
      setProgress(0);
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 1) {
            if (currentImageIndex < currentStory.images.length - 1) {
              setCurrentImageIndex((prev) => prev + 1);
              return 0;
            } else {
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
              router.back();
              return prev;
            }
          }
          return prev + 0.01;
        });
      }, 50);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentStory, currentImageIndex]);

  const handlePress = (event: any) => {
    const x = event.nativeEvent.locationX;
    if (x < width / 2) {
      if (currentImageIndex > 0) {
        setCurrentImageIndex((prev) => prev - 1);
      }
    } else {
      if (currentStory && currentImageIndex < currentStory.images.length - 1) {
        setCurrentImageIndex((prev) => prev + 1);
      } else {
        router.back();
      }
    }
  };

  if (!currentStory) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        style={styles.touchable}
      >
        <Image
          source={{ uri: currentStory.images[currentImageIndex] }}
          style={styles.image}
        />
        <View style={styles.progressContainer}>
          {currentStory.images.map((_, index) => (
            <View key={index} style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width:
                      index < currentImageIndex
                        ? '100%'
                        : index === currentImageIndex
                        ? `${progress * 100}%`
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: currentStory.user.avatar }}
              style={styles.avatar}
            />
            <Text style={styles.username}>{currentStory.user.username}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  touchable: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
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
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 60,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  username: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
