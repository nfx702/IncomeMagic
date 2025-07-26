'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  IconChartLine, 
  IconCurrencyDollar, 
  IconBrain, 
  IconSettings,
  IconSun,
  IconMoon,
  IconFlame,
  IconDroplet,
  IconSparkles,
  IconCalendarEvent,
  IconTarget,
  IconCash,
  IconMenu2,
  IconX,
  IconHome,
  IconFileText,
  IconUser
} from '@tabler/icons-react';
import { useTheme } from '@/components/providers/ThemeProvider';

const navigation = [
  { name: 'Dashboard', href: '/', icon: IconHome },
  { name: 'Positions', href: '/positions', icon: IconCurrencyDollar },
  { name: 'Analytics', href: '/analytics', icon: IconBrain },
  { name: 'Forecast', href: '/analytics/forecast', icon: IconChartLine },
  { name: 'Recommendations', href: '/recommendations', icon: IconSparkles },
  { name: 'Reports', href: '/analytics/monthly', icon: IconFileText },
  { name: 'Settings', href: '/settings', icon: IconSettings },
  { name: 'Profile', href: '/profile', icon: IconUser },
];

interface FloatingNavigationProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function FloatingNavigation({ isOpen, setIsOpen }: FloatingNavigationProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.floating-nav-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const toggleTheme = () => {
    const themes: Array<'light-pastel' | 'dark-pastel' | 'vibrant' | 'maya' | 'neutral'> = 
      ['light-pastel', 'dark-pastel', 'vibrant', 'maya', 'neutral'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light-pastel': return IconSun;
      case 'dark-pastel': return IconMoon;
      case 'vibrant': return IconFlame;
      case 'neutral': return IconDroplet;
      default: return IconSun;
    }
  };

  const ThemeIcon = getThemeIcon();

  if (!mounted) return null;

  return (
    <div className="floating-nav-container fixed left-6 top-1/2 -translate-y-1/2 z-50">
      {/* Floating Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`floating-nav-toggle ${isOpen ? 'active' : ''}`}
        aria-label="Toggle navigation"
      >
        {isOpen ? (
          <IconX size={24} strokeWidth={2} className="nav-icon" />
        ) : (
          <IconMenu2 size={24} strokeWidth={2} className="nav-icon" />
        )}
      </button>

      {/* Navigation Menu */}
      <nav className={`floating-nav ${isOpen ? 'open' : ''}`}>
        <ul className="nav-list">
          {navigation.map((item, index) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.name} style={{ animationDelay: `${index * 0.05}s` }}>
                <Link
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon size={22} strokeWidth={1.5} />
                  <span className="nav-tooltip">{item.name}</span>
                </Link>
              </li>
            );
          })}
          
          {/* Theme Toggle */}
          <li className="nav-divider" style={{ animationDelay: `${navigation.length * 0.05}s` }}>
            <button
              onClick={toggleTheme}
              className="nav-item theme-toggle"
              title="Change theme"
            >
              <ThemeIcon size={22} strokeWidth={1.5} />
              <span className="nav-tooltip">Theme</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}