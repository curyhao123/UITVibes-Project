import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { Avatar } from '../Avatar';
import { ConfirmationModal } from '../ConfirmationModal';

export interface GroupSettingsModalProps {
  visible: boolean;
  groupName: string;
  members: any[];
  adminIds?: string[];
  currentUserId?: string;
  isLeavingGroup: boolean;
  removingMemberId: string | null;
  isUserOnline: (userId: string) => boolean;
  onClose: () => void;
  onOpenAddMember: () => void;
  onConfirmRemoveMember: (member: any) => Promise<void>;
  onConfirmLeaveGroup: () => Promise<void>;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  visible,
  groupName,
  members,
  adminIds = [],
  currentUserId = '',
  isLeavingGroup,
  removingMemberId,
  isUserOnline,
  onClose,
  onOpenAddMember,
  onConfirmRemoveMember,
  onConfirmLeaveGroup,
}) => {
  const [localConfirmAction, setLocalConfirmAction] = useState<
    | { type: 'remove'; member: any }
    | { type: 'leave' }
    | null
  >(null);

  const isAdmin = adminIds.includes(currentUserId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.settingsSheet}
          onStartShouldSetResponder={() => true}
        >
          <TouchableOpacity
            style={styles.settingsSheetHeader}
            onPress={onClose}
            activeOpacity={0.9}
          >
            <Text style={styles.settingsSheetTitle}>{groupName}</Text>
            <Feather name="x" size={22} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>

          <ScrollView
            style={styles.settingsContent}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.settingsContentContainer}
          >
            <Text style={styles.sectionLabel}>Members ({members.length})</Text>
            {members.map((member) => {
              const memberIsAdmin = adminIds.includes(member.id);
              const isSelf = member.id === currentUserId;
              const canRemoveMember = isAdmin && !isSelf;
              const isRemoving = removingMemberId === member.id;
              return (
                <View key={member.id} style={styles.memberRow}>
                  <Avatar
                    user={member}
                    size="small"
                    showOnlineIndicator={true}
                    isOnline={isUserOnline(member.id)}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.displayName || member.username || 'User'}
                      {isSelf ? <Text style={styles.memberMeta}> (You)</Text> : null}
                      {memberIsAdmin ? <Text style={styles.memberAdmin}> - Admin</Text> : null}
                    </Text>
                  </View>
                  {canRemoveMember && (
                    <TouchableOpacity
                      style={styles.removeMemberBtn}
                      onPress={() => setLocalConfirmAction({ type: 'remove', member })}
                      disabled={removingMemberId != null || isLeavingGroup}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {isRemoving ? (
                        <ActivityIndicator size="small" color="#dc3545" />
                      ) : (
                        <Feather name="user-minus" size={20} color="#dc3545" strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.settingsActions}>
            {isAdmin && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onClose();
                  setTimeout(onOpenAddMember, 50);
                }}
                disabled={isLeavingGroup}
                activeOpacity={0.7}
              >
                <Feather name="user-plus" size={20} color={AppColors.text} strokeWidth={2} />
                <Text style={styles.actionText}>Add member</Text>
                <Feather name="chevron-right" size={20} color={AppColors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setLocalConfirmAction({ type: 'leave' })}
              disabled={isLeavingGroup || removingMemberId != null}
              activeOpacity={0.7}
            >
              {isLeavingGroup ? (
                <ActivityIndicator size="small" color="#dc3545" />
              ) : (
                <Feather name="log-out" size={20} color="#dc3545" strokeWidth={2} />
              )}
              <Text style={styles.leaveGroupText}>Leave group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Local confirmation modal for remove member / leave group */}
      {localConfirmAction && (
        <ConfirmationModal
          visible={localConfirmAction != null}
          title={localConfirmAction.type === 'remove' ? 'Remove member?' : 'Leave group?'}
          message={
            localConfirmAction.type === 'remove'
              ? `Remove ${
                  localConfirmAction.member.displayName ||
                  localConfirmAction.member.username ||
                  'this member'
                } from this group?`
              : 'You will stop receiving messages from this group.'
          }
          icon={localConfirmAction.type === 'remove' ? 'user-minus' : 'log-out'}
          variant="danger"
          confirmLabel={localConfirmAction.type === 'remove' ? 'Remove' : 'Leave'}
          busy={removingMemberId != null || isLeavingGroup}
          onCancel={() => setLocalConfirmAction(null)}
          onConfirm={async () => {
            if (localConfirmAction.type === 'remove') {
              await onConfirmRemoveMember(localConfirmAction.member);
              setLocalConfirmAction(null);
            } else {
              await onConfirmLeaveGroup();
              setLocalConfirmAction(null);
            }
          }}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '85%',
  },
  settingsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layoutPadding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  settingsSheetTitle: {
    ...Typography.bodySemibold,
    fontWeight: '600',
    color: AppColors.text,
    flex: 1,
  },
  settingsContent: {
    flexGrow: 1,
  },
  settingsContentContainer: {
    paddingBottom: 8,
  },
  sectionLabel: {
    ...Typography.caption,
    color: AppColors.textMuted,
    fontWeight: '600',
    paddingHorizontal: layoutPadding,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 11,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...Typography.body,
    color: AppColors.text,
    fontWeight: '500',
  },
  memberMeta: {
    color: AppColors.textMuted,
    fontWeight: '400',
  },
  memberAdmin: {
    color: AppColors.primary,
    fontWeight: '400',
  },
  removeMemberBtn: {
    padding: 8,
  },
  settingsActions: {
    marginTop: 12,
    paddingBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: layoutPadding,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    minHeight: 50,
  },
  actionText: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
  },
  leaveGroupText: {
    ...Typography.body,
    flex: 1,
    color: '#dc3545',
  },
});
