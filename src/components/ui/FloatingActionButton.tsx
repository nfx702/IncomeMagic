'use client';

import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

interface FloatingActionButtonProps {
  onClick?: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fab animate-scaleIn"
      aria-label="Add new item"
    >
      <IconPlus 
        size={24} 
        strokeWidth={2}
        className={`text-white transition-transform duration-200 ${
          isHovered ? 'rotate-90' : ''
        }`}
      />
    </button>
  );
}