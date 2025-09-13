'use client';

import { useState } from 'react';
import { Status, Algorithm } from '@/types/traffic';

export const useTrafficControl = () => {
  const [isLoading, setIsLoading] = useState(false);

  const manualOverride = async (lightId: string, status: Status) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/traffic/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'manual_override',
          lightId,
          status
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in manual override:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const emergencyMode = async (lightId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/traffic/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'emergency_mode',
          lightId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in emergency mode:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const changeAlgorithm = async (lightId: string, algorithm: Algorithm) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/traffic/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'change_algorithm',
          lightId,
          algorithm
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error changing algorithm:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTiming = async (lightId: string, timing: any) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/traffic/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_timing',
          lightId,
          timing
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating timing:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetTrafficLight = async (lightId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/traffic/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset',
          lightId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error resetting traffic light:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    manualOverride,
    emergencyMode,
    changeAlgorithm,
    updateTiming,
    resetTrafficLight
  };
};