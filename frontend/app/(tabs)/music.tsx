import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Header } from '../../components';
import { useApp } from '../../context/AppContext';
import { getTracks, toggleTrackLike, getMusicArtists, toggleMusicArtistFollow } from '../../services/api';
import { Track, MusicArtist } from '../../data/mockData';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import defaultAvatar from '../../assets/images/default-avatar.png';

export default function MusicScreen() {
  const { currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'tracks' | 'artists'>('tracks');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<MusicArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trackData, artistData] = await Promise.all([
        getTracks(),
        getMusicArtists(),
      ]);
      setTracks(trackData);
      setArtists(artistData);
    } catch (error) {
      console.error('Failed to load music data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackLike = async (trackId: string) => {
    const result = await toggleTrackLike(trackId);
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? { ...t, isLiked: result, likes: result ? t.likes + 1 : t.likes - 1 }
          : t
      )
    );
  };

  const handleArtistFollow = async (artistId: string) => {
    const result = await toggleMusicArtistFollow(artistId);
    setArtists((prev) =>
      prev.map((a) => (a.id === artistId ? { ...a, isFollowing: result } : a))
    );
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const renderHeader = () => (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending Now</Text>
      </View>
      <FlatList
        horizontal
        data={tracks.slice(0, 3)}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.featuredCard}>
            <Image source={{ uri: item.cover }} style={styles.featuredCover} />
            <View style={styles.featuredOverlay}>
              <Text style={styles.featuredTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.featuredArtist} numberOfLines={1}>{item.artist}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity style={styles.trackItem}>
      <Image source={{ uri: item.cover }} style={styles.trackCover} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artist} · {item.album}</Text>
      </View>
      <View style={styles.trackActions}>
        <TouchableOpacity onPress={() => handleTrackLike(item.id)} style={styles.likeBtn}>
          <Feather
            name="heart"
            size={16}
            color={item.isLiked ? AppColors.primary : AppColors.textMuted}
            fill={item.isLiked ? AppColors.primary : 'transparent'}
          />
          <Text style={styles.likeCount}>{formatCount(item.likes)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton}>
          <Feather name="play-circle" size={32} color={AppColors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderArtistItem = ({ item }: { item: MusicArtist }) => (
    <TouchableOpacity style={styles.artistItem}>
      <Image source={item.avatar ? { uri: item.avatar } : defaultAvatar} style={styles.artistAvatar} />
      <View style={styles.artistInfo}>
        <Text style={styles.artistName}>{item.name}</Text>
        <Text style={styles.artistFollowers}>{item.followers} followers</Text>
      </View>
      <TouchableOpacity
        style={[styles.followBtn, item.isFollowing && styles.followBtnFollowing]}
        onPress={() => handleArtistFollow(item.id)}
      >
        <Text style={[styles.followBtnText, item.isFollowing && styles.followBtnTextFollowing]}>
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Music"
        avatarUser={currentUser}
        rightAction={
          <View style={styles.searchIconWrap}>
            <Feather name="search" size={20} color={AppColors.iconMuted} strokeWidth={2} />
          </View>
        }
        bottomContent={
          <>
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Feather name="search" size={17} color={AppColors.iconMuted} strokeWidth={2} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tracks or artists"
                  placeholderTextColor={AppColors.iconMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Feather name="x" size={17} color={AppColors.iconMuted} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'tracks' && styles.activeTab]}
                onPress={() => setActiveTab('tracks')}
              >
                <Feather
                  name="music"
                  size={20}
                  color={activeTab === 'tracks' ? AppColors.primary : AppColors.iconMuted}
                  strokeWidth={2}
                />
                <Text style={[styles.tabText, activeTab === 'tracks' && styles.activeTabText]}>
                  Tracks
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'artists' && styles.activeTab]}
                onPress={() => setActiveTab('artists')}
              >
                <Feather
                  name="users"
                  size={20}
                  color={activeTab === 'artists' ? AppColors.primary : AppColors.iconMuted}
                  strokeWidth={2}
                />
                <Text style={[styles.tabText, activeTab === 'artists' && styles.activeTabText]}>
                  Artists
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
      />

      {activeTab === 'tracks' ? (
        <FlatList
          data={tracks}
          renderItem={renderTrackItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={artists}
          renderItem={renderArtistItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    paddingHorizontal: layoutPadding,
    paddingTop: 8,
    paddingBottom: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    marginLeft: 8,
    color: AppColors.text,
    padding: 0,
  },
  tabContainer: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: AppColors.primary,
  },
  tabText: {
    ...Typography.bodyMedium,
    fontSize: 14,
    color: AppColors.iconMuted,
  },
  activeTabText: {
    color: AppColors.primary,
  },
  listContent: {
    paddingBottom: 100,
  },
  horizontalList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
  },
  featuredCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: AppColors.surface,
  },
  featuredCover: {
    width: 140,
    height: 140,
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  featuredTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredArtist: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  trackCover: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
  },
  trackArtist: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  trackActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  likeCount: {
    fontSize: 12,
    color: AppColors.textMuted,
  },
  playButton: {
    marginLeft: 4,
  },
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  artistAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  artistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  artistName: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
  },
  artistFollowers: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followBtnFollowing: {
    backgroundColor: AppColors.border,
  },
  followBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  followBtnTextFollowing: {
    color: AppColors.text,
  },
});
