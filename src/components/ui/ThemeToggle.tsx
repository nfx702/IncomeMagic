'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { IconSun, IconMoon, IconSparkles, IconCloud, IconStars } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes: Array<{
    value: 'light-pastel' | 'dark-pastel' | 'vibrant' | 'maya' | 'neutral';
    icon: typeof IconSun;
    label: string;
  }> = [
    { value: 'light-pastel', icon: IconSun, label: 'Light' },
    { value: 'dark-pastel', icon: IconMoon, label: 'Dark' },
    { value: 'vibrant', icon: IconSparkles, label: 'Vibrant' },
    { value: 'maya', icon: IconStars, label: 'Maya' },
    { value: 'neutral', icon: IconCloud, label: 'Neutral' },
  ];

  const currentThemeIndex = themes.findIndex(t => t.value === theme);
  const currentTheme = themes[currentThemeIndex];

  const handleToggle = () => {
    const nextIndex = (currentThemeIndex + 1) % themes.length;
    setTheme(themes[nextIndex].value);
  };

  return (
    <button
      onClick={handleToggle}
      className="theme-toggle-pill"
      aria-label="Toggle theme"
    >
      <div className="theme-toggle-handle">
        <currentTheme.icon size={14} />
      </div>
    </button>
  );
}

export function ThemeToggleExpanded() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes = [
    { value: 'light-pastel', icon: IconSun, label: 'Light Pastel' },
    { value: 'dark-pastel', icon: IconMoon, label: 'Dark Pastel' },
    { value: 'vibrant', icon: IconSparkles, label: 'Vibrant' },
    { value: 'maya', icon: IconStars, label: 'Maya Magic' },
    { value: 'neutral', icon: IconCloud, label: 'Neutral' },
  ] as const;

  return (
    <div className="glass-card p-4 space-y-3">
      <p className="text-xs font-medium text-secondary uppercase tracking-wider">
        Choose Theme
      </p>
      <div className="grid grid-cols-1 gap-2">
        {themes.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`theme-toggle-btn ${theme === value ? 'active' : ''}`}
            title={label}
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}