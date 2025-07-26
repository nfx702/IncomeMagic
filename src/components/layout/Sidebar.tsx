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
  IconBolt,
  IconCalendarEvent,
  IconChevronDown,
  IconChevronRight,
  IconTarget,
  IconCash
} from '@tabler/icons-react';
import { useTheme } from '@/components/providers/ThemeProvider';

const navigation = [
  { name: 'Dashboard', href: '/', icon: IconChartLine },
  { name: 'Positions', href: '/positions', icon: IconCurrencyDollar },
  { 
    name: 'Analytics', 
    href: '/analytics', 
    icon: IconBrain,
    submenu: [
      { name: 'Overview', href: '/analytics' },
      { name: 'Monthly', href: '/analytics/monthly', icon: IconCalendarEvent },
      { name: 'Forecast', href: '/analytics/forecast', icon: IconChartLine },
      { name: 'Targets', href: '/analytics/targets', icon: IconTarget },
      { name: 'Dividends', href: '/analytics/dividends', icon: IconCash }
    ]
  },
  { name: 'Recommendations', href: '/recommendations', icon: IconSparkles },
  { name: 'Settings', href: '/settings', icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['Analytics']));
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = (name: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedMenus(newExpanded);
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 glass-panel transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-72'
    }`}>
      {/* Enhanced Logo Section */}
      <div className="flex h-16 items-center justify-center px-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="sidebar-icon-btn animate-float">
            <IconBolt size={24} className="text-accent-primary" />
          </div>
          {!isCollapsed && (
            <h1 className="text-lg font-semibold text-gradient" 
                style={{ letterSpacing: 'var(--letter-spacing-sidebar)' }}>
              Income Magic
            </h1>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.submenu && item.submenu.some(sub => pathname === sub.href));
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isExpanded = expandedMenus.has(item.name);

          return (
            <div key={item.name}>
              {hasSubmenu ? (
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={24} strokeWidth={1.5} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left" style={{ letterSpacing: 'var(--letter-spacing-sidebar)' }}>
                        {item.name}
                      </span>
                      {isExpanded ? 
                        <IconChevronDown size={16} /> : 
                        <IconChevronRight size={16} />
                      }
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={24} strokeWidth={1.5} />
                  {!isCollapsed && (
                    <span style={{ letterSpacing: 'var(--letter-spacing-sidebar)' }}>
                      {item.name}
                    </span>
                  )}
                </Link>
              )}

              {/* Submenu */}
              {hasSubmenu && isExpanded && !isCollapsed && (
                <div className="mt-1 ml-8 space-y-1">
                  {item.submenu.map((subItem) => {
                    const isSubActive = pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`sidebar-item text-sm ${isSubActive ? 'active' : ''}`}
                      >
                        {subItem.icon ? (
                          <subItem.icon size={18} strokeWidth={1.5} />
                        ) : (
                          <div className="w-1 h-1 rounded-full bg-current opacity-40" />
                        )}
                        <span style={{ letterSpacing: 'var(--letter-spacing-sidebar)' }}>
                          {subItem.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="p-4 border-t border-white/10">
        {!isCollapsed ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-secondary uppercase tracking-wider">
              Theme
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTheme('light-pastel')}
                className={`theme-toggle-btn ${theme === 'light-pastel' ? 'active' : ''}`}
                title="Light Pastel"
              >
                <IconSun size={16} />
                <span className="text-xs">Light</span>
              </button>
              <button
                onClick={() => setTheme('dark-pastel')}
                className={`theme-toggle-btn ${theme === 'dark-pastel' ? 'active' : ''}`}
                title="Dark Pastel"
              >
                <IconMoon size={16} />
                <span className="text-xs">Dark</span>
              </button>
              <button
                onClick={() => setTheme('vibrant')}
                className={`theme-toggle-btn ${theme === 'vibrant' ? 'active' : ''}`}
                title="Vibrant"
              >
                <IconFlame size={16} />
                <span className="text-xs">Vibrant</span>
              </button>
              <button
                onClick={() => setTheme('neutral')}
                className={`theme-toggle-btn ${theme === 'neutral' ? 'active' : ''}`}
                title="Neutral"
              >
                <IconDroplet size={16} />
                <span className="text-xs">Neutral</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              const themes: Array<'light-pastel' | 'dark-pastel' | 'vibrant' | 'maya' | 'neutral'> = 
                ['light-pastel', 'dark-pastel', 'vibrant', 'maya', 'neutral'];
              const currentIndex = themes.indexOf(theme);
              const nextIndex = (currentIndex + 1) % themes.length;
              setTheme(themes[nextIndex]);
            }}
            className="icon-btn w-full"
            title="Change Theme"
          >
            {theme === 'light-pastel' && <IconSun size={20} />}
            {theme === 'dark-pastel' && <IconMoon size={20} />}
            {theme === 'vibrant' && <IconFlame size={20} />}
            {theme === 'neutral' && <IconDroplet size={20} />}
          </button>
        )}
      </div>
    </div>
  );
}

