import React from 'react';
import { ProfileSettingsView } from '../profile/ProfileSettingsModal';

interface MyAccountViewProps {
  onBack?: () => void;
}

export const MyAccountView: React.FC<MyAccountViewProps> = ({ onBack }) => {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <ProfileSettingsView onBack={onBack} />
    </div>
  );
};
