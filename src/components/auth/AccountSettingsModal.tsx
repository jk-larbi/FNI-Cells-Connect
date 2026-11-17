import React from 'react';
import { ProfileSettingsModal, ProfileSection } from '../profile/ProfileSettingsModal';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: ProfileSection;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'menu',
}) => {
  return (
    <ProfileSettingsModal
      isOpen={isOpen}
      onClose={onClose}
      initialSection={initialSection}
    />
  );
};
