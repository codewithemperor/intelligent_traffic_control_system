'use client';

import { useState, useEffect } from 'react';
import { TrafficLight } from '@/types/traffic';

export const useTrafficData = () => {
  const [data, setData] = useState<TrafficLight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrafficData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/traffic/lights');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const trafficData = await response.json();
      setData(trafficData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching traffic data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficData();
    
    // Set up periodic refresh
    const interval = setInterval(fetchTrafficData, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchTrafficData
  };
};