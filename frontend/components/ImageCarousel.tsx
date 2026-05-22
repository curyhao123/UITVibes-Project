import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ListRenderItem,
  ViewToken,
  LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { AppColors } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCarouselProps {
  images: string[];
  height?: number;
  onPress?: () => void;
  showDots?: boolean;
  showCarouselIcon?: boolean;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  height = SCREEN_WIDTH,
  onPress,
  showDots = true,
  showCarouselIcon = true,
}) => {
  const flatListRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [carouselWidth, setCarouselWidth] = useState(SCREEN_WIDTH);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setCarouselWidth(w);
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem: ListRenderItem<string> = useCallback(
    ({ item }) => (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        disabled={!onPress}
        style={{ width: carouselWidth, height }}
      >
        <Image
          source={{ uri: item }}
          style={{ width: '100%', height, borderRadius: 0 }}
          contentFit="cover"
        />
      </TouchableOpacity>
    ),
    [carouselWidth, height, onPress],
  );

  const keyExtractor = useCallback((item: string, index: number) => `${item}-${index}`, []);

  if (images.length === 0) return null;

  // Single image — full-width, no dots/icon
  if (images.length === 1) {
    return (
      <View onLayout={onLayout}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={onPress}
          disabled={!onPress}
          style={{ width: carouselWidth, height }}
        >
          <Image
            source={{ uri: images[0] }}
            style={{ width: '100%', height, borderRadius: 0 }}
            contentFit="cover"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Multi-image — full-width swipe carousel
  return (
    <View onLayout={onLayout}>
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: carouselWidth,
          offset: carouselWidth * index,
          index,
        })}
      />

      {/* Carousel icon — góc trên phải */}
      {showCarouselIcon && (
        <View style={styles.carouselIconBadge} pointerEvents="none">
          <Feather name="layout" size={12} color="#FFFFFF" strokeWidth={2} />
        </View>
      )}

      {/* Pagination dots — phía dưới ảnh */}
      {showDots && (
        <View style={styles.dotsContainer} pointerEvents="none">
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  carouselIconBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
