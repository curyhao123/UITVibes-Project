import React, { useMemo } from 'react';
import { Text, TextStyle, StyleProp, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { searchUsers } from '../services/userService';
import { AppColors } from '../constants/theme';

interface MentionTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  usernameStyle?: StyleProp<TextStyle>;
  onUsernamePress?: (username: string) => void;
  numberOfLines?: number;
}

/**
 * Parses text and highlights @username mentions
 * Backend uses regex: @(\w+) to extract mentions
 */
export const MentionText: React.FC<MentionTextProps> = ({
  text,
  style,
  usernameStyle,
  onUsernamePress,
  numberOfLines,
}) => {
  const router = useRouter();

  const parsedText = useMemo(() => {
    // Split by @username pattern - same as backend: @(\w+)
    const mentionRegex = /@(\w+)/g;
    const parts: Array<{ type: 'text' | 'mention'; content: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      // Add the mention (including @ symbol)
      parts.push({
        type: 'mention',
        content: match[0], // includes @
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
        router.push(`/profile/${exactMatch.id}` as any);
      } else if (users.length > 0) {
        // Fallback to first result
        router.push(`/profile/${users[0].id}` as any);
      }
    } catch (error) {
      console.error('[MentionText] Failed to resolve username:', error);
    }
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
              style={[styles.mention, usernameStyle]}
              onPress={() => handleMentionPress(username)}
            >
              {part.content}
            </Text>
          );
        }
        // Render text content, replacing newlines with spaces
        const textContent = part.content.replace(/\n/g, ' ').trim();
        if (!textContent) return null;
        return <Text key={index}>{textContent}</Text>;
      })}
    </Text>
  );
};

const styles = {
  mention: {
    color: AppColors.primary,
    fontWeight: '600' as const,
  },
};
