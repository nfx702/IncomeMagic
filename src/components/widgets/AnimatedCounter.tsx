'use client';

import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  separator?: string;
  className?: string;
  onComplete?: () => void;
}

export function AnimatedCounter({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  separator = ',',
  className = '',
  onComplete
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startValueRef = useRef(0);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsAnimating(true);
    startTimeRef.current = Date.now();
    startValueRef.current = displayValue;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - (startTimeRef.current || now);
      const progress = Math.min(elapsed / duration, 1);

      // Easing function - ease out cubic
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValueRef.current + (value - startValueRef.current) * easeOutCubic;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, onComplete]);

  const formatNumber = (num: number): string => {
    const fixed = num.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');
    
    // Add thousand separators
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    
    return decimal ? `${formattedInteger}.${decimal}` : formattedInteger;
  };

  return (
    <span className={`inline-block ${className} ${isAnimating ? 'animate-pulse-subtle' : ''}`}>
      {prefix}{formatNumber(displayValue)}{suffix}
    </span>
  );
}