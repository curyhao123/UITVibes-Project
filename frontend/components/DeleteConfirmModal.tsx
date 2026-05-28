import React from 'react';
import { ConfirmationModal } from './ConfirmationModal';

interface DeleteConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  onCancel,
  onConfirm,
}) => (
  <ConfirmationModal
    visible={visible}
    title="Delete comment?"
    message="This comment will be permanently deleted and cannot be recovered."
    icon="trash-2"
    variant="danger"
    confirmLabel="Delete"
    onCancel={onCancel}
    onConfirm={onConfirm}
  />
);
