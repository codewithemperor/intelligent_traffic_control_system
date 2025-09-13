'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrafficIntersection } from '@/components/traffic/TrafficIntersection';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { SystemOverview } from '@/components/dashboard/SystemOverview';
import { AlertSystem } from '@/components/dashboard/AlertSystem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Status } from '@/types/traffic';
import { useTrafficData } from '@/hooks/useTrafficData';
import { useWebSocket } from '@/hooks/useWebSocketClient';
import { Play, Pause, RotateCcw, AlertTriangle, Activity, Zap } from 'lucide-react';

export default function Dashboard() {
  const [intersections, setIntersections] = useState<any[]>([]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  const [vehicleInterval, setVehicleInterval] = useState<NodeJS.Timeout | null>(null);
  const [vehicleMovementInterval, setVehicleMovementInterval] = useState<NodeJS.Timeout | null>(null);

  const { data: trafficData, loading, error, refetch } = useTrafficData();
  const { socket, connected } = useWebSocket();

  // Initialize intersections data
  useEffect(() => {
    if (trafficData) {
      setIntersections(trafficData);
    }
  }, [trafficData]);

  // Handle WebSocket connections
  useEffect(() => {
    if (socket) {
      // Listen for traffic light updates
      socket.on('traffic-light-changed', (data) => {
        setIntersections(prev => 
          prev.map(intersection => ({
            ...intersection,
            trafficLights: intersection.trafficLights.map(light => 
              light.id === data.lightId 
                ? { ...light, status: data.newStatus, lastChanged: new Date(data.timestamp) }
                : light
            )
          }))
        );
      });

      // Listen for vehicle count updates
      socket.on('vehicle-count-changed', (data) => {
        setIntersections(prev => 
          prev.map(intersection => ({
            ...intersection,
            roads: intersection.roads?.map(road => 
              road.id === data.roadId 
                ? { ...road, vehicleCount: data.count, congestionLevel: data.congestionLevel }
                : road
            )
          }))
        );
      });

      // Listen for system alerts
      socket.on('system-alert', (data) => {
        setAlerts(prev => [{ ...data, timestamp: new Date() }, ...prev].slice(0, 10));
      });

      // Listen for performance updates
      socket.on('performance-updated', (data) => {
        setSystemStatus(prev => ({ ...prev, ...data }));
      });
    }

    return () => {
      if (socket) {
        socket.off('traffic-light-changed');
        socket.off('vehicle-count-changed');
        socket.off('system-alert');
        socket.off('performance-updated');
      }
    };
  }, [socket]);

  // Auto-refresh traffic data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetch]);

  const startSimulation = async () => {
    try {
      setIsSimulationRunning(true);
      
      // Add system alert
      setAlerts(prev => [
        {
          type: 'info',
          message: 'Traffic simulation started',
          timestamp: new Date()
        },
        ...prev
      ]);

      // Start traffic light cycling
      const cycleInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/traffic/cycle', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`Traffic cycle processed: ${result.updatedIntersections} intersections updated`);
            refetch(); // Refresh data
          }
        } catch (error) {
          console.error('Error in traffic cycle:', error);
        }
      }, 10000); // Every 10 seconds

      setSimulationInterval(cycleInterval);

      // Start vehicle generation
      const vehicleGenInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/sensors/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              count: Math.floor(Math.random() * 3) + 1 // Generate 1-3 vehicles
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`Generated ${result.vehicles.length} vehicles`);
            refetch(); // Refresh data
          }
        } catch (error) {
          console.error('Error in vehicle generation:', error);
        }
      }, 5000); // Every 5 seconds

      setVehicleInterval(vehicleGenInterval);

      // Start vehicle movement simulation
      const vehicleMovementInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/sensors/readings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              action: 'simulate_movement'
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`Vehicle movement processed: ${result.movedVehicles || 0} vehicles moved`);
            refetch(); // Refresh data
          }
        } catch (error) {
          console.error('Error in vehicle movement:', error);
        }
      }, 3000); // Every 3 seconds

      // Store the vehicle movement interval
      setVehicleMovementInterval(vehicleMovementInterval);

    } catch (error) {
      console.error('Error starting simulation:', error);
      setIsSimulationRunning(false);
    }
  };

  const stopSimulation = () => {
    setIsSimulationRunning(false);
    
    // Clear intervals
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }
    
    if (vehicleInterval) {
      clearInterval(vehicleInterval);
      setVehicleInterval(null);
    }

    if (vehicleMovementInterval) {
      clearInterval(vehicleMovementInterval);
      setVehicleMovementInterval(null);
    }
    
    // Add system alert
    setAlerts(prev => [
      {
        type: 'warning',
        message: 'Traffic simulation stopped',
        timestamp: new Date()
      },
      ...prev
    ]);
  };

  const resetSimulation = async () => {
    try {
      stopSimulation();
      
      await Promise.all(
        intersections.map(intersection => 
          fetch('/api/traffic/control', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'reset_intersection',
              intersectionId: intersection.id
            }),
          })
        )
      );

      refetch(); // Refresh data

      setAlerts(prev => [
        {
          type: 'info',
          message: 'Traffic simulation reset',
          timestamp: new Date()
        },
        ...prev
      ]);
    } catch (error) {
      console.error('Error resetting simulation:', error);
    }
  };

  const handleManualOverride = async (lightId: string, status: Status) => {
    try {
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

      if (response.ok) {
        const updatedLight = await response.json();
        setIntersections(prev => 
          prev.map(intersection => ({
            ...intersection,
            trafficLights: intersection.trafficLights.map(light => 
              light.id === lightId ? updatedLight : light
            )
          }))
        );
      }
    } catch (error) {
      console.error('Error in manual override:', error);
    }
  };

  const handleIntersectionEmergency = async (intersectionId: string) => {
    try {
      const response = await fetch('/api/traffic/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'intersection_emergency',
          intersectionId
        }),
      });

      if (response.ok) {
        const updatedIntersection = await response.json();
        setIntersections(prev => 
          prev.map(intersection => 
            intersection.id === intersectionId ? updatedIntersection : intersection
          )
        );
      }
    } catch (error) {
      console.error('Error in intersection emergency mode:', error);
    }
  };

  const calculateSystemMetrics = () => {
    if (!intersections.length) return {
      totalIntersections: 0,
      activeIntersections: 0,
      totalTrafficLights: 0,
      activeTrafficLights: 0,
      totalVehicles: 0,
      averageCongestion: 0,
      systemEfficiency: 0
    };

    const activeIntersections = intersections.filter(intersection => intersection.isActive).length;
    const totalTrafficLights = intersections.reduce((sum, intersection) => sum + intersection.trafficLights.length, 0);
    const activeTrafficLights = intersections.reduce((sum, intersection) => 
      sum + intersection.trafficLights.filter(light => light.isActive).length, 0
    );
    const totalVehicles = intersections.reduce((sum, intersection) => 
      sum + intersection.roads?.reduce((roadSum, road) => roadSum + road.vehicleCount, 0) || 0, 0
    );
    const totalCongestion = intersections.reduce((sum, intersection) => 
      sum + intersection.roads?.reduce((roadSum, road) => roadSum + road.congestionLevel, 0) || 0, 0
    ) / intersections.reduce((sum, intersection) => sum + (intersection.roads?.length || 1), 0);
    
    return {
      totalIntersections: intersections.length,
      activeIntersections,
      totalTrafficLights,
      activeTrafficLights,
      totalVehicles,
      averageCongestion: Math.round(totalCongestion * 100),
      systemEfficiency: Math.round((1 - totalCongestion) * 100)
    };
  };

  const metrics = calculateSystemMetrics();

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-semibold">Error loading system</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Intelligent Traffic Control System
              </h1>
              <Badge variant="outline" className="ml-3">
                Adeseun Ogundoyin Polytechnic
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={startSimulation}
                  disabled={isSimulationRunning}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Start</span>
                </Button>
                
                <Button
                  onClick={stopSimulation}
                  disabled={!isSimulationRunning}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Pause className="h-4 w-4" />
                  <span>Stop</span>
                </Button>
                
                <Button
                  onClick={resetSimulation}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="intersections">Intersections</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="control">Control</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* System Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricsCard
                title="Total Intersections"
                value={metrics.totalIntersections}
                icon={<Activity className="h-6 w-6" />}
                color="text-blue-600"
              />
              <MetricsCard
                title="Active Lights"
                value={metrics.activeTrafficLights}
                icon={<Zap className="h-6 w-6" />}
                color="text-green-600"
              />
              <MetricsCard
                title="Total Vehicles"
                value={metrics.totalVehicles}
                icon={<Activity className="h-6 w-6" />}
                color="text-purple-600"
              />
              <MetricsCard
                title="System Efficiency"
                value={`${metrics.systemEfficiency}%`}
                icon={<Zap className="h-6 w-6" />}
                color="text-orange-600"
              />
            </div>

            {/* System Overview */}
            <SystemOverview intersections={intersections} />

            {/* Alerts */}
            <AlertSystem alerts={alerts} />
          </TabsContent>

          <TabsContent value="intersections" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {intersections.map((intersection) => (
                <motion.div
                  key={intersection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TrafficIntersection
                    intersection={intersection}
                    onManualOverride={handleManualOverride}
                    onEmergencyMode={handleIntersectionEmergency}
                  />
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Analytics features coming soon. This will include traffic flow analysis, 
                  performance metrics, and detailed reports.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="control" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Control Panel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Advanced control features coming soon. This will include algorithm selection, 
                  timing adjustments, and system-wide controls.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}