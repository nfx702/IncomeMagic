'use client';

import { useState, useEffect } from 'react';

interface AnalogWatchProps {
  size?: number;
  showSeconds?: boolean;
  showDate?: boolean;
  timezone?: string;
  className?: string;
}

export function AnalogWatch({ 
  size = 200, 
  showSeconds = true, 
  showDate = false,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  className = '' 
}: AnalogWatchProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate angles for watch hands
  const secondAngle = (time.getSeconds() * 6) - 90; // 6 degrees per second
  const minuteAngle = (time.getMinutes() * 6) + (time.getSeconds() * 0.1) - 90; // 6 degrees per minute + smooth second movement
  const hourAngle = ((time.getHours() % 12) * 30) + (time.getMinutes() * 0.5) - 90; // 30 degrees per hour + smooth minute movement

  // Roman numerals for hour markers
  const romanNumerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  // Generate hour markers
  const generateHourMarkers = () => {
    const markers = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) - 90;
      const isMainHour = i % 3 === 0; // 12, 3, 6, 9 are larger
      const markerLength = isMainHour ? 20 : 12;
      const markerWidth = isMainHour ? 3 : 2;
      
      const x1 = (size / 2) + (size / 2 - 25) * Math.cos((angle * Math.PI) / 180);
      const y1 = (size / 2) + (size / 2 - 25) * Math.sin((angle * Math.PI) / 180);
      const x2 = (size / 2) + (size / 2 - 25 - markerLength) * Math.cos((angle * Math.PI) / 180);
      const y2 = (size / 2) + (size / 2 - 25 - markerLength) * Math.sin((angle * Math.PI) / 180);

      markers.push(
        <line
          key={`marker-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="currentColor"
          strokeWidth={markerWidth}
          className="text-slate-800 dark:text-slate-200"
        />
      );
    }
    return markers;
  };

  // Generate Roman numeral positions
  const generateRomanNumerals = () => {
    const numerals = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) - 90;
      const radius = size / 2 - 50;
      const x = (size / 2) + radius * Math.cos((angle * Math.PI) / 180);
      const y = (size / 2) + radius * Math.sin((angle * Math.PI) / 180);

      numerals.push(
        <text
          key={`numeral-${i}`}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-slate-800 dark:text-slate-200 font-serif font-semibold"
          fontSize={size < 150 ? 12 : 16}
          fill="currentColor"
        >
          {romanNumerals[i]}
        </text>
      );
    }
    return numerals;
  };

  return (
    <div className={`analog-watch ${className}`}>
      <div className="relative">
        <svg 
          width={size} 
          height={size} 
          className="drop-shadow-xl"
          role="img"
          aria-label={`Analog clock showing ${time.toLocaleTimeString()}`}
        >
          {/* Watch face background */}
          <defs>
            <radialGradient id="watchFaceGradient" cx="0.3" cy="0.3" r="0.8">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#f8fafc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.7" />
            </radialGradient>
            <radialGradient id="watchFaceGradientDark" cx="0.3" cy="0.3" r="0.8">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#334155" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.7" />
            </radialGradient>
            <filter id="innerShadow">
              <feOffset dx="0" dy="0"/>
              <feGaussianBlur stdDeviation="3" result="offset-blur"/>
              <feFlood floodColor="#000000" floodOpacity="0.1"/>
              <feComposite in="SourceGraphic" in2="offset-blur" operator="out"/>
            </filter>
          </defs>

          {/* Outer ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 2}
            fill="url(#watchFaceGradient)"
            stroke="#d4d4d8"
            strokeWidth="3"
            className="dark:fill-[url(#watchFaceGradientDark)] dark:stroke-slate-600"
            filter="url(#innerShadow)"
          />

          {/* Inner face */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 15}
            fill="rgba(255, 255, 255, 0.1)"
            stroke="rgba(148, 163, 184, 0.3)"
            strokeWidth="1"
            className="dark:fill-rgba(30, 41, 59, 0.1) dark:stroke-rgba(100, 116, 139, 0.3)"
          />

          {/* Hour markers */}
          {generateHourMarkers()}

          {/* Roman numerals */}
          {generateRomanNumerals()}

          {/* Center dot */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="6"
            fill="#1e293b"
            className="dark:fill-slate-300"
          />

          {/* Hour hand */}
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + (size / 4 - 30) * Math.cos((hourAngle * Math.PI) / 180)}
            y2={size / 2 + (size / 4 - 30) * Math.sin((hourAngle * Math.PI) / 180)}
            stroke="#1e293b"
            strokeWidth="6"
            strokeLinecap="round"
            className="dark:stroke-slate-300"
            style={{
              transformOrigin: `${size / 2}px ${size / 2}px`,
              transition: 'transform 0.5s ease-in-out'
            }}
          />

          {/* Minute hand */}
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + (size / 2 - 40) * Math.cos((minuteAngle * Math.PI) / 180)}
            y2={size / 2 + (size / 2 - 40) * Math.sin((minuteAngle * Math.PI) / 180)}
            stroke="#374151"
            strokeWidth="4"
            strokeLinecap="round"
            className="dark:stroke-slate-400"
            style={{
              transformOrigin: `${size / 2}px ${size / 2}px`,
              transition: 'transform 0.5s ease-in-out'
            }}
          />

          {/* Second hand */}
          {showSeconds && (
            <>
              <line
                x1={size / 2}
                y1={size / 2}
                x2={size / 2 + (size / 2 - 30) * Math.cos((secondAngle * Math.PI) / 180)}
                y2={size / 2 + (size / 2 - 30) * Math.sin((secondAngle * Math.PI) / 180)}
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                style={{
                  transformOrigin: `${size / 2}px ${size / 2}px`,
                  transition: time.getSeconds() === 0 ? 'none' : 'transform 0.1s ease-out'
                }}
              />
              {/* Second hand counterweight */}
              <line
                x1={size / 2}
                y1={size / 2}
                x2={size / 2 - 20 * Math.cos((secondAngle * Math.PI) / 180)}
                y2={size / 2 - 20 * Math.sin((secondAngle * Math.PI) / 180)}
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                style={{
                  transformOrigin: `${size / 2}px ${size / 2}px`,
                  transition: time.getSeconds() === 0 ? 'none' : 'transform 0.1s ease-out'
                }}
              />
            </>
          )}

          {/* Center hub */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="4"
            fill="#dc2626"
          />
        </svg>

        {/* Digital time display (optional) */}
        {showDate && (
          <div className="mt-4 text-center">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {time.toLocaleDateString(undefined, { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {timezone}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}