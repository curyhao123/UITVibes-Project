import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Avatar } from './Avatar';
import { searchUsers, getFollowing, User } from '../services/userService';
import { AppColors } from '../constants/theme';

interface MentionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  multiline?: boolean;
  style?: object;
  inputStyle?: object;
  maxLength?: number;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChangeText,
  placeholder = 'Add a comment...',
  onSubmit,
  multiline = false,
  style,
  inputStyle,
  maxLength,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isShowingFriends, setIsShowingFriends] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendsCacheRef = useRef<User[]>([]);

  // Load friends list when @ is typed with no query
  const loadFriendsList = useCallback(async () => {
    // Return cached friends if available
    if (friendsCacheRef.current.length > 0) {
      setSuggestions(friendsCacheRef.current.slice(0, 10));
      setIsShowingFriends(true);
      return;
    }

    setLoading(true);
    try {
      const friends = await getFollowing('current');
      const topFriends = friends.slice(0, 10);
      friendsCacheRef.current = topFriends;
      setSuggestions(topFriends);
      setIsShowingFriends(true);
    } catch (error) {
      console.error('[MentionInput] Failed to load friends:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search users by query
  const searchUsersByQuery = useCallback(async (query: string) => {
    if (query.length < 1) {
      // If query is empty, show friends list
      loadFriendsList();
      return;
    }

    setLoading(true);
    setIsShowingFriends(false);
    try {
      const results = await searchUsers(query);
      setSuggestions(results.slice(0, 8));
    } catch (error) {
      console.error('[MentionInput] Failed to search users:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [loadFriendsList]);

  const handleTextChange = useCallback(
    (text: string) => {
      onChangeText(text);

      // Find the last @ symbol before the cursor
      const lastAtIndex = text.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = text.slice(lastAtIndex + 1);

        // Check if there's a space or newline after the @ (meaning mention is complete)
        const hasSpaceAfter = text[lastAtIndex + 1] === ' ' || text[lastAtIndex + 1] === '\n';

        // If @ is at the start or preceded by space/newline, and no space after yet
        const isValidMentionStart = lastAtIndex === 0 || /[\s\n]/.test(text[lastAtIndex - 1]);
        const isTypingMention = !hasSpaceAfter && textAfterAt.indexOf(' ') === -1 && textAfterAt.indexOf('\n') === -1;

        if (isValidMentionStart && isTypingMention) {
          setMentionStartIndex(lastAtIndex);
          setShowSuggestions(true);
          setSearchQuery(textAfterAt);

          // Debounce the search
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
          }
          searchTimeoutRef.current = setTimeout(() => {
            if (textAfterAt.length === 0) {
              // Empty query - show friends list
              loadFriendsList();
            } else {
              // Has query - search users
              searchUsersByQuery(textAfterAt);
            }
          }, 150);
        } else {
          // Mention is complete or invalid
          setShowSuggestions(false);
          setSuggestions([]);
          setMentionStartIndex(-1);
          setIsShowingFriends(false);
        }
      } else {
        // No @ found
        setShowSuggestions(false);
        setSuggestions([]);
        setMentionStartIndex(-1);
        setIsShowingFriends(false);
      }
    },
    [onChangeText, loadFriendsList, searchUsersByQuery]
  );

  const handleSelectUser = useCallback(
    (user: User) => {
      if (mentionStartIndex === -1) return;

      // Use displayName as username for mention since backend username might be empty
      const username = user.displayName?.toLowerCase().replace(/\s+/g, '') || user.username || user.id;

      // Replace from @ to current position with @username
      const beforeMention = value.slice(0, mentionStartIndex);
      const afterMention = value.slice(value.lastIndexOf('@') + 1).replace(/^\S*/, '');
      const afterCursor = afterMention.startsWith(' ') ? afterMention : ' ' + afterMention;

      const newText = `${beforeMention}@${username}${afterCursor}`;
      onChangeText(newText);

      setShowSuggestions(false);
      setSuggestions([]);
      setMentionStartIndex(-1);
      setIsShowingFriends(false);
      setSearchQuery('');

      // Focus back on input
      inputRef.current?.focus();
    },
    [value, onChangeText, mentionStartIndex]
  );

  const renderSuggestionItem = (item: User) => {
    // Format username - use displayName if username is empty
    const handle = item.username || item.displayName?.toLowerCase().replace(/\s+/g, '') || item.id;

    return (
      <TouchableOpacity
        style={styles.suggestionItem}
        onPress={() => handleSelectUser(item)}
        activeOpacity={0.7}
      >
        <Avatar
          user={{
            id: item.id,
            username: item.username,
            displayName: item.displayName,
            avatar: item.avatar,
          }}
          size="small"
        />
        <View style={styles.suggestionInfo}>
          <Text style={styles.suggestionName} numberOfLines={1}>
            {item.displayName || item.username}
          </Text>
          <Text style={styles.suggestionUsername} numberOfLines={1}>
            @{handle}
          </Text>
        </View>
        {isShowingFriends && (
          <View style={styles.friendBadge}>
            <Text style={styles.friendBadgeText}>Following</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    if (!isShowingFriends || searchQuery.length > 0) return null;
    return (
      <View style={styles.header}>
        <Text style={styles.headerText}>Suggestions</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isShowingFriends) return null;
    return (
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {suggestions.length > 0 ? 'Tap to mention' : 'No following yet'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        ref={inputRef}
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={AppColors.iconMuted}
        value={value}
        onChangeText={handleTextChange}
        onSubmitEditing={onSubmit}
        multiline={multiline}
        blurOnSubmit={!multiline}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={maxLength}
      />

      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {isShowingFriends ? 'Loading friends...' : 'Searching...'}
              </Text>
            </View>
          ) : suggestions.length > 0 ? (
            <ScrollView
              style={styles.suggestionsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderHeader()}
              {suggestions.map((item) => (
                <View key={item.id}>
                  {renderSuggestionItem(item)}
                </View>
              ))}
              {renderFooter()}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isShowingFriends ? 'No following yet' : 'No users found'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    flex: 1,
    height: 36,
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: AppColors.text,
    backgroundColor: '#F2F2F2',
    borderRadius: 18,
  },
  suggestionsContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    maxHeight: 280,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 280,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
    backgroundColor: AppColors.background,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.borderLight,
    backgroundColor: AppColors.background,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: AppColors.textMuted,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 10,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
  },
  suggestionUsername: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  friendBadge: {
    backgroundColor: `${AppColors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  friendBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.primary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: AppColors.textMuted,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: AppColors.textMuted,
  },
});
