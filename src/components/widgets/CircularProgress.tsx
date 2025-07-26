'use client';

import { useEffect, useState } from 'react';

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  showValue?: boolean;
  animated?: boolean;
  duration?: number;
}

export function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color = '#10B981',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  label,
  showValue = true,
  animated = true,
  duration = 1000
}: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    if (!animated) {
      setAnimatedValue(value);
      return;
    }
    
    const startTime = Date.now();
    const startValue = animatedValue;
    const valueChange = value - startValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (valueChange * easeOutCubic);
      
      setAnimatedValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, animated, duration, animatedValue]);

  const percentage = Math.min((animatedValue / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90 drop-shadow-lg"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-30"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out drop-shadow-sm"
          style={{
            filter: `drop-shadow(0 0 8px ${color}40)`
          }}
        />
        
        {/* Glow effect */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth / 2}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="opacity-40 blur-sm"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <div className="text-center">
            <div className="text-2xl font-bold text-white/90 leading-none">
              {Math.round(animatedValue)}
            </div>
            {label && (
              <div className="text-xs font-medium text-white/60 mt-1 tracking-wider uppercase">
                {label}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}