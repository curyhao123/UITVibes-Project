import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Header } from '../../components';
import { mockReels } from '../../data/mockData';
import { AppColors } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

export default function ReelsScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const renderItem = ({ item, index }: { item: typeof mockReels[0]; index: number }) => (
    <View style={styles.container}>
      <Image source={{ uri: 'https://picsum.photos/seed/reels/400/800' }} style={styles.backgroundImage} />
      <View style={styles.overlay}>
        <View style={styles.bottomContent}>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.user.username}</Text>
            <Text style={styles.caption}>{item.caption}</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionItem}>
              <Feather name="heart" size={28} color="white" />
              <Text style={styles.actionText}>{item.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Feather name="message-circle" size={28} color="white" />
              <Text style={styles.actionText}>{item.comments}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Feather name="send" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Feather name="more-vertical" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Reels"
        showAvatar={false}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.reelsCameraBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="camera" size={20} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={mockReels}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  reelsCameraBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundImage: {
    width: width,
    height: height,
    position: 'absolute',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bottomContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  caption: {
    color: 'white',
    fontSize: 14,
  },
  actions: {
    alignItems: 'center',
  },
  actionItem: {
    marginBottom: 20,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
});
