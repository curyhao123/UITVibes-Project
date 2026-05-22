/**
 * AddToHighlightModal — Instagram-style "Add to Highlight" modal.
 *
 * Flow:
 * 1. User taps "Add to Highlight" in Story Viewer
 * 2. Modal shows existing highlight groups + "Create new" option
 * 3. User selects group or creates new one
 * 4. API call to attach StoryItem to the selected HighlightGroup
 * 5. Success toast + close
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApp } from "../../context/AppContext";
import {
  HighlightGroup,
  getUserHighlights,
  createHighlightGroup,
  addStoryItemToHighlight,
} from "../../services/highlightService";
import { AppColors, layoutPadding, borderRadius } from "../../constants/theme";
import { Typography } from "../../constants/typography";

interface AddToHighlightModalProps {
  visible: boolean;
  storyItemId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddToHighlightModal: React.FC<AddToHighlightModalProps> = ({
  visible,
  storyItemId,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useApp();
  const [highlights, setHighlights] = useState<HighlightGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (visible && currentUser?.id) {
      loadHighlights();
    }
  }, [visible, currentUser?.id]);

  const loadHighlights = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    const data = await getUserHighlights(currentUser.id);
    setHighlights(data);
    setIsLoading(false);
  };

  const handleSelectGroup = async (groupId: string) => {
    setIsLoading(true);
    const result = await addStoryItemToHighlight(groupId, storyItemId);
    setIsLoading(false);

    if (result) {
      onSuccess?.();
      onClose();
    } else {
      Alert.alert("Error", "Failed to add to highlight. Please try again.");
    }
  };

  const handleCreateAndAdd = async () => {
    const title = newTitle.trim();
    if (!title) {
      Alert.alert("Title required", "Please enter a highlight title.");
      return;
    }
    if (title.length > 100) {
      Alert.alert("Title too long", "Highlight title must be 100 characters or less.");
      return;
    }

    setIsCreating(true);
    const group = await createHighlightGroup(title);
    setIsCreating(false);

    if (!group) {
      Alert.alert("Error", "Failed to create highlight. Please try again.");
      return;
    }

    // Add the story item to the newly created group
    const result = await addStoryItemToHighlight(group.id, storyItemId);
    if (result) {
      setNewTitle("");
      setShowCreateForm(false);
      onSuccess?.();
      onClose();
    } else {
      Alert.alert("Error", "Highlight created but failed to add story. Please try again.");
    }
  };

  const handleClose = () => {
    setNewTitle("");
    setShowCreateForm(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={AppColors.text} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.title}>Add to Highlight</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Existing highlights */}
            {isLoading && !showCreateForm ? (
              <ActivityIndicator
                size="small"
                color={AppColors.primary}
                style={styles.loader}
              />
            ) : showCreateForm ? (
              /* Create new form */
              <View style={styles.createForm}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Highlight title"
                    placeholderTextColor={AppColors.iconMuted}
                    value={newTitle}
                    onChangeText={setNewTitle}
                    maxLength={100}
                    autoFocus
                  />
                </View>
                <View style={styles.createFormActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setShowCreateForm(false);
                      setNewTitle("");
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createBtn, !newTitle.trim() && styles.createBtnDisabled]}
                    onPress={handleCreateAndAdd}
                    disabled={!newTitle.trim() || isCreating}
                  >
                    {isCreating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.createBtnText}>Create & Add</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* Highlight groups list */}
                {highlights.length > 0 ? (
                  highlights.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={styles.highlightItem}
                      onPress={() => handleSelectGroup(group.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.highlightThumb}>
                        {group.coverImage ? (
                          <Image
                            source={{ uri: group.coverImage }}
                            style={styles.thumbImage}
                          />
                        ) : (
                          <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
                            <Feather name="image" size={20} color={AppColors.iconMuted} />
                          </View>
                        )}
                      </View>
                      <View style={styles.highlightInfo}>
                        <Text style={styles.highlightTitle}>{group.title}</Text>
                        <Text style={styles.highlightMeta}>
                          {group.itemCount} {group.itemCount === 1 ? "story" : "stories"}
                        </Text>
                      </View>
                      <Feather name="plus" size={20} color={AppColors.primary} strokeWidth={2} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Feather name="bookmark" size={40} color={AppColors.iconMuted} strokeWidth={1.5} />
                    <Text style={styles.emptyText}>No highlights yet</Text>
                    <Text style={styles.emptySubtext}>
                      Create your first highlight to save stories
                    </Text>
                  </View>
                )}

                {/* Create new highlight */}
                <TouchableOpacity
                  style={styles.createNewBtn}
                  onPress={() => setShowCreateForm(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.createNewIcon}>
                    <Feather name="plus" size={24} color={AppColors.primary} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.createNewText}>Create new highlight</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: AppColors.surfaceElevated,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layoutPadding,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: AppColors.text,
  },
  placeholder: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: layoutPadding,
    paddingBottom: 40,
  },
  loader: {
    paddingVertical: 40,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 14,
  },
  highlightThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: AppColors.surface,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  highlightInfo: {
    flex: 1,
  },
  highlightTitle: {
    ...Typography.bodySemibold,
    color: AppColors.text,
    marginBottom: 2,
  },
  highlightMeta: {
    ...Typography.meta,
    color: AppColors.iconMuted,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    ...Typography.sectionTitle,
    color: AppColors.iconMuted,
  },
  emptySubtext: {
    ...Typography.caption,
    color: AppColors.iconMuted,
    textAlign: "center",
  },
  createNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.border,
  },
  createNewIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.surfaceElevated,
  },
  createNewText: {
    ...Typography.bodySemibold,
    color: AppColors.primary,
  },
  createForm: {
    paddingTop: 8,
  },
  inputRow: {
    marginBottom: 16,
  },
  input: {
    ...Typography.body,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AppColors.text,
  },
  createFormActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cancelBtnText: {
    ...Typography.bodySemibold,
    color: AppColors.text,
  },
  createBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: AppColors.primary,
    borderRadius: borderRadius.md,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    ...Typography.bodySemibold,
    color: "#fff",
  },
});
