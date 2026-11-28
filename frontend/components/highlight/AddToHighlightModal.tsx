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
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borderRadius, layoutPadding, type ThemeColors } from "../../constants/theme";
import { Typography } from "../../constants/typography";
import { useApp } from "../../context/AppContext";
import {
  HighlightGroup,
  addStoryItemToHighlight,
  createHighlightGroup,
  getUserHighlights,
} from "../../services/highlightService";
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { currentUser } = useApp();
  const insets = useSafeAreaInsets();
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
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={Keyboard.dismiss}
        >
          <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Feather name="x" size={22} color={colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={styles.title}>Add to Highlight</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
            {/* Existing highlights */}
            {isLoading && !showCreateForm ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.loader}
              />
            ) : showCreateForm ? (
              /* Create new form */
              <View style={styles.createForm}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Highlight title"
                    placeholderTextColor={colors.iconMuted}
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
                            <Feather name="image" size={20} color={colors.iconMuted} />
                          </View>
                        )}
                      </View>
                      <View style={styles.highlightInfo}>
                        <Text style={styles.highlightTitle}>{group.title}</Text>
                        <Text style={styles.highlightMeta}>
                          {group.itemCount} {group.itemCount === 1 ? "story" : "stories"}
                        </Text>
                      </View>
                      <Feather name="plus" size={20} color={colors.primary} strokeWidth={2} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Feather name="plus-square" size={40} color={colors.iconMuted} strokeWidth={1.5} />
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
                    <Feather name="plus-square" size={24} color={colors.primary} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.createNewText}>Create new highlight</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  backdrop: {
    flexGrow: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.75,
    minHeight: 400,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layoutPadding,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
    color: colors.text,
  },
  placeholder: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: layoutPadding,
    paddingBottom: 80,
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
    backgroundColor: colors.surface,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightInfo: {
    flex: 1,
  },
  highlightTitle: {
    ...Typography.bodySemibold,
    color: colors.text,
    marginBottom: 2,
  },
  highlightMeta: {
    ...Typography.meta,
    color: colors.iconMuted,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    ...Typography.sectionTitle,
    color: colors.iconMuted,
  },
  emptySubtext: {
    ...Typography.caption,
    color: colors.iconMuted,
    textAlign: "center",
  },
  createNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  createNewIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElevated,
  },
  createNewText: {
    ...Typography.bodySemibold,
    color: colors.primary,
  },
  createForm: {
    paddingTop: 8,
  },
  inputRow: {
    marginBottom: 16,
  },
  input: {
    ...Typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
  },
  createFormActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    ...Typography.bodySemibold,
    color: colors.text,
  },
  createBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.primary,
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
