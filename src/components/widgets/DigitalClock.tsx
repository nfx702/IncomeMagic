'use client';

import { useState, useEffect } from 'react';

interface DigitalClockProps {
  showDate?: boolean;
  showSeconds?: boolean;
  timeZone?: string;
  format?: '12' | '24';
  className?: string;
}

export function DigitalClock({ 
  showDate = true, 
  showSeconds = true, 
  timeZone = 'America/New_York',
  format = '12',
  className = ''
}: DigitalClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: format === '12',
      timeZone: timeZone
    };
    
    return date.toLocaleTimeString('en-US', options);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timeZone
    };
    
    return date.toLocaleDateString('en-US', options);
  };

  const getMarketStatus = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    // Market hours: 9:30 AM - 4:00 PM ET (570 - 960 minutes)
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isMarketHours = currentTime >= marketOpen && currentTime < marketClose;
    
    return isWeekday && isMarketHours ? 'OPEN' : 'CLOSED';
  };

  const marketStatus = getMarketStatus();

  return (
    <div className={`relative text-center ${className}`}>
      {/* Market Status Indicator */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className={`status-indicator ${marketStatus === 'OPEN' ? 'live' : 'closed'}`}></div>
        <span className="metric-label">
          Market {marketStatus}
        </span>
      </div>

      {/* Digital Time Display */}
      <div className="space-y-2">
        <div className="text-2xl font-semibold text-primary">
          {formatTime(time)}
        </div>
        
        {showDate && (
          <div className="text-sm text-secondary">
            {formatDate(time)}
          </div>
        )}
      </div>

      {/* Time Zone */}
      <div className="mt-3">
        <span className="text-xs text-tertiary">
          {timeZone.split('/')[1]?.replace('_', ' ') || 'EST'}
        </span>
      </div>
    </div>
  );
}