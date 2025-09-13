'use client';

import { useState, useEffect, useCallback } from 'react';

interface CountdownTimer {
  id: string;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
}

export function useCountdown() {
  const [timers, setTimers] = useState<{ [key: string]: CountdownTimer }>({});

  // Start a countdown timer
  const startCountdown = useCallback((id: string, totalTime: number) => {
    setTimers(prev => ({
      ...prev,
      [id]: {
        id,
        timeLeft: totalTime,
        totalTime,
        isRunning: true
      }
    }));
  }, []);

  // Stop a countdown timer
  const stopCountdown = useCallback((id: string) => {
    setTimers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isRunning: false
      }
    }));
  }, []);

  // Reset a countdown timer
  const resetCountdown = useCallback((id: string, totalTime: number) => {
    setTimers(prev => ({
      ...prev,
      [id]: {
        id,
        timeLeft: totalTime,
        totalTime,
        isRunning: false
      }
    }));
  }, []);

  // Update countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const updated: { [key: string]: CountdownTimer } = {};
        
        Object.keys(prev).forEach(id => {
          const timer = prev[id];
          if (timer.isRunning && timer.timeLeft > 0) {
            updated[id] = {
              ...timer,
              timeLeft: timer.timeLeft - 1
            };
          } else if (timer.isRunning && timer.timeLeft <= 0) {
            updated[id] = {
              ...timer,
              timeLeft: 0,
              isRunning: false
            };
          } else {
            updated[id] = timer;
          }
        });
        
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Get timer for a specific ID
  const getTimer = useCallback((id: string) => {
    return timers[id] || {
      id,
      timeLeft: 0,
      totalTime: 0,
      isRunning: false
    };
  }, [timers]);

  // Calculate remaining time based on traffic light status and timing
  const calculateTrafficLightCountdown = useCallback((light: any) => {
    if (!light || !light.timing) return 0;
    
    const { status, timing, lastChanged } = light;
    const currentTime = new Date();
    const elapsedSeconds = (currentTime.getTime() - new Date(lastChanged).getTime()) / 1000;
    
    let timeInPhase = 0;
    
    switch (status) {
      case 'RED':
        timeInPhase = timing.red - elapsedSeconds;
        break;
      case 'YELLOW':
        timeInPhase = timing.yellow - elapsedSeconds;
        break;
      case 'GREEN':
        timeInPhase = timing.green - elapsedSeconds;
        break;
      default:
        timeInPhase = 0;
    }
    
    return Math.max(0, Math.round(timeInPhase));
  }, []);

  return {
    timers,
    startCountdown,
    stopCountdown,
    resetCountdown,
    getTimer,
    calculateTrafficLightCountdown
  };
}