'use client';

import { useState, useEffect } from 'react';

export const useAutoGeneration = (interval: number = 5000) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);

  const startGeneration = () => {
    setIsGenerating(true);
  };

  const stopGeneration = () => {
    setIsGenerating(false);
  };

  const generateVehicles = async (count: number = 1) => {
    try {
      const response = await fetch('/api/sensors/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count }),
      });

      if (response.ok) {
        const result = await response.json();
        setGenerationCount(prev => prev + result.vehicles.length);
        return result.vehicles;
      }
    } catch (error) {
      console.error('Error generating vehicles:', error);
    }
    return [];
  };

  useEffect(() => {
    let generationInterval: NodeJS.Timeout;

    if (isGenerating) {
      generationInterval = setInterval(async () => {
        await generateVehicles(Math.floor(Math.random() * 3) + 1); // Generate 1-3 vehicles
      }, interval);
    }

    return () => {
      if (generationInterval) {
        clearInterval(generationInterval);
      }
    };
  }, [isGenerating, interval]);

  return {
    isGenerating,
    generationCount,
    startGeneration,
    stopGeneration,
    generateVehicles
  };
};