import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { searchUsers } from '../services/userService';
import { getHashtagColor, normalizeHashtag } from '../utils/hashtagColor';
import { useOpenProfile } from '../hooks/useOpenProfile';

interface MentionTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  usernameStyle?: StyleProp<TextStyle>;
  onUsernamePress?: (username: string) => void;
  numberOfLines?: number;
}

/**
 * Parses text and highlights @username mentions and #hashtags.
 * Mirrors the backend's @(\w+) and #(\w+); .NET's \w is Unicode-aware, hence \p{L} for hashtags.
 */
export const MentionText: React.FC<MentionTextProps> = ({
  text,
  style,
  usernameStyle,
  onUsernamePress,
  numberOfLines,
}) => {
  const router = useRouter();
  const openProfile = useOpenProfile();
  const { colors } = useTheme();

  const parsedText = useMemo(() => {
    const tokenRegex = /@\w+|#[\p{L}\p{N}_]+/gu;
    const parts: { type: 'text' | 'mention' | 'hashtag'; content: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      parts.push({
        type: match[0].startsWith('@') ? 'mention' : 'hashtag',
        content: match[0],
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return parts;
  }, [text]);

  const handleMentionPress = async (username: string) => {
    // If custom handler is provided, use it
    if (onUsernamePress) {
      onUsernamePress(username);
      return;
    }

    // Otherwise, resolve username to userId and navigate
    try {
      const users = await searchUsers(username);
      // Find exact match by displayName (case insensitive)
      const exactMatch = users.find(
        (u) =>
          (u.displayName?.toLowerCase() === username.toLowerCase()) ||
          (u.username?.toLowerCase() === username.toLowerCase())
      );

      if (exactMatch) {
        openProfile(exactMatch.id);
      } else if (users.length > 0) {
        // Fallback to first result
        openProfile(users[0].id);
      }
    } catch (error) {
      console.error('[MentionText] Failed to resolve username:', error);
    }
  };

  const handleHashtagPress = (hashtag: string) => {
    router.push({
      pathname: '/(tabs)/search',
      params: { hashtag: normalizeHashtag(hashtag), ts: String(Date.now()) },
    } as any);
  };

  // Filter out empty parts
  const validParts = parsedText.filter((part) => part.content.length > 0);

  if (validParts.length === 0) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {validParts.map((part, index) => {
        if (part.type === 'mention') {
          const username = part.content.slice(1); // Remove @ symbol
          return (
            <Text
              key={index}
              style={[{ color: colors.primary, fontWeight: '600' }, usernameStyle]}
              onPress={() => handleMentionPress(username)}
            >
              {part.content}
            </Text>
          );
        }
        if (part.type === 'hashtag') {
          return (
            <Text
              key={index}
              style={{ color: getHashtagColor(part.content, colors.hashtagPalette), fontWeight: '600' }}
              onPress={() => handleHashtagPress(part.content)}
            >
              {part.content}
            </Text>
          );
        }
        // Keep the spaces between tokens; only flatten newlines.
        const textContent = part.content.replace(/\n/g, ' ');
        if (!textContent) return null;
        return <Text key={index}>{textContent}</Text>;
      })}
    </Text>
  );
};
