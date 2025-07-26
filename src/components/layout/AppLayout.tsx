'use client';

import { ReactNode, useState } from 'react';
import { FloatingNavigation } from './FloatingNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingNavigation isOpen={isNavOpen} setIsOpen={setIsNavOpen} />
      <main 
        className={`relative pr-8 py-8 transition-all duration-300 ${
          isNavOpen ? 'pl-64 lg:pl-72 md:pl-68' : 'pl-24 lg:pl-32 md:pl-28'
        }`}
      >
        {children}
      </main>
    </div>
  );
}