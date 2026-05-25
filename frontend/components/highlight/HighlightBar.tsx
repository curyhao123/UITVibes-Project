/**
 * HighlightBar — Instagram-style horizontal strip on profile page.
 *
 * Shows:
 * - "Add story" circle (current user only) → navigates to /story/create
 * - Highlight circles (existing highlights) → opens viewer modal
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  HighlightGroup,
  getHighlightDetail,
  deleteHighlightGroup,
} from "../../services/highlightService";
import { AppColors, layoutPadding, borderRadius } from "../../constants/theme";
import { Typography } from "../../constants/typography";

interface HighlightBarProps {
  highlights: HighlightGroup[];
  isCurrentUser?: boolean;
  onRefresh?: () => void;
}

interface HighlightViewerProps {
  visible: boolean;
  highlight: HighlightGroup | null;
  onClose: () => void;
  isOwner?: boolean;
  onDeleted?: () => void;
}

const HighlightCircle: React.FC<{
  highlight: HighlightGroup;
  onPress: () => void;
}> = ({ highlight, onPress }) => (
  <TouchableOpacity
    style={styles.circleItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.circleOuter}>
      {highlight.coverImage ? (
        <Image
          source={{ uri: highlight.coverImage }}
          style={styles.circleImage}
        />
      ) : (
        <View style={[styles.circleImage, styles.circlePlaceholder]}>
          <Feather name="image" size={18} color={AppColors.iconMuted} />
        </View>
      )}
    </View>
    <Text style={styles.circleLabel} numberOfLines={1}>
      {highlight.title}
    </Text>
  </TouchableOpacity>
);

const AddStoryCircle = () => {
  const router = useRouter();
  const pulseScale = useSharedValue(1);

  const startPulse = () => { pulseScale.value = withSpring(0.9); };
  const endPulse = () => { pulseScale.value = withSpring(1.0); };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={() => router.push("/story/create" as any)}
      onPressIn={startPulse}
      onPressOut={endPulse}
      activeOpacity={1}
      style={styles.circleItem}
    >
      <Animated.View style={[styles.addStoryCircle, animatedStyle]}>
        <Feather name="plus" size={26} color={AppColors.primary} strokeWidth={2} />
      </Animated.View>
      <Text style={styles.addStoryText}>Add story</Text>
    </TouchableOpacity>
  );
};

const AddHighlightCircle: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity style={styles.circleItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.circleOuter}>
      <View style={styles.addIconCircle}>
        <Feather name="plus-square" size={22} color={AppColors.primary} strokeWidth={2.5} />
      </View>
    </View>
    <Text style={styles.circleLabel}>New</Text>
  </TouchableOpacity>
);

const HighlightViewer: React.FC<HighlightViewerProps> = ({
  visible,
  highlight,
  onClose,
  isOwner,
  onDeleted,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!highlight) return null;

  const items = highlight.items ?? [];
  const current = items[currentIndex];

  const handleDelete = async () => {
    if (!highlight) return;
    setIsDeleting(true);
    const ok = await deleteHighlightGroup(highlight.id);
    setIsDeleting(false);
    if (ok) {
      onDeleted?.();
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={viewerStyles.backdrop}>
        <View style={viewerStyles.container}>
          {/* Header */}
          <View style={viewerStyles.header}>
            <View>
              <Text style={viewerStyles.title}>{highlight.title}</Text>
              <Text style={viewerStyles.meta}>{items.length} items</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={viewerStyles.closeBtn}>
              <Feather name="x" size={22} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {items.length === 0 ? (
            <View style={viewerStyles.empty}>
              <Feather name="image" size={48} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <Text style={viewerStyles.emptyText}>No stories in this highlight</Text>
            </View>
          ) : current ? (
            <View style={viewerStyles.mediaWrapper}>
              {current.mediaUrl ? (
                <Image
                  source={{ uri: current.mediaUrl }}
                  style={viewerStyles.media}
                  contentFit="cover"
                />
              ) : (
                <View style={viewerStyles.mediaPlaceholder}>
                  <Feather name="image" size={48} color="rgba(255,255,255,0.3)" />
                  <Text style={viewerStyles.placeholderText}>Media no longer available</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Navigation dots */}
          {items.length > 1 && (
            <View style={viewerStyles.dots}>
              {items.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[viewerStyles.dot, i === currentIndex && viewerStyles.dotActive]}
                  onPress={() => setCurrentIndex(i)}
                />
              ))}
            </View>
          )}

          {/* Delete button (owner only) */}
          {isOwner && items.length > 0 && (
            <TouchableOpacity
              style={viewerStyles.deleteBtn}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Feather name="trash-2" size={16} color="#fff" strokeWidth={2} />
              <Text style={viewerStyles.deleteBtnText}>
                {isDeleting ? "Deleting..." : "Delete Highlight"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const HighlightBar: React.FC<HighlightBarProps> = ({
  highlights,
  isCurrentUser = false,
  onRefresh,
}) => {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<HighlightGroup | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const handleHighlightPress = async (highlight: HighlightGroup) => {
    setIsLoadingDetail(true);
    setSelectedHighlight(highlight);
    setViewerVisible(true);
    const detail = await getHighlightDetail(highlight.id);
    if (detail) {
      setSelectedHighlight(detail);
    }
    setIsLoadingDetail(false);
  };

  const handleDeleted = () => {
    onRefresh?.();
    setViewerVisible(false);
    setSelectedHighlight(null);
  };

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {isCurrentUser && <AddStoryCircle />}
          {highlights.map((highlight) => (
            <HighlightCircle
              key={highlight.id}
              highlight={highlight}
              onPress={() => handleHighlightPress(highlight)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Highlight Viewer Modal */}
      <HighlightViewer
        visible={viewerVisible}
        highlight={selectedHighlight}
        onClose={() => setViewerVisible(false)}
        isOwner={isCurrentUser}
        onDeleted={handleDeleted}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.border,
  },
  scrollContent: {
    paddingHorizontal: layoutPadding,
    gap: 16,
  },
  addStoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.surfaceElevated,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  addStoryText: {
    ...Typography.meta,
    marginTop: 4,
    color: AppColors.text,
  },
  circleItem: {
    alignItems: "center",
    width: 64,
  },
  circleOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#22c55e",
    overflow: "hidden",
    backgroundColor: AppColors.surface,
  },
  circleImage: {
    width: "100%",
    height: "100%",
  },
  circlePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  addIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: AppColors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.surfaceElevated,
  },
  circleLabel: {
    ...Typography.meta,
    color: AppColors.text,
    textAlign: "center",
    marginTop: 4,
  },
});

const viewerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaWrapper: {
    aspectRatio: 9 / 16,
    backgroundColor: "#000",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  placeholderText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    textAlign: "center",
  },
  empty: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    backgroundColor: "#fff",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "rgba(220,38,38,0.15)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  deleteBtnText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
});
