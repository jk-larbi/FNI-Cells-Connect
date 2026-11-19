import React from 'react';
import { IosEmojiPicker } from './IosEmojiPicker';

interface FniEmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

export const FniEmojiPicker: React.FC<FniEmojiPickerProps> = ({ onSelect, onClose }) => {
  return (
    <IosEmojiPicker
      onSelectEmoji={onSelect}
      onClose={onClose}
    />
  );
};
