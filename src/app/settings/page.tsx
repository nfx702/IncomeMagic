'use client';

import { AppLayout } from '@/components/layout/AppLayout';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Configure your trading preferences</p>
        </div>

        <div className="glass-card p-6 liquid-glass">
          <p className="text-center text-muted-foreground">Settings page coming soon...</p>
        </div>
      </div>
    </AppLayout>
  );
}