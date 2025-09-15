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
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  const { data: trafficData, loading, error, refetch } = useTrafficData();
  const { 
    socket, 
    connected, 
    simulationState, 
    startSimulation, 
    stopSimulation, 
    toggleDebug,
    requestTrafficData,
    lastVehicleMovement,
    lastTrafficCycle,
    lastSystemAlert
  } = useWebSocket();

  // Initialize intersections data
  useEffect(() => {
    if (trafficData) {
      setIntersections(trafficData);
    }
  }, [trafficData]);

  // Handle WebSocket events for real-time updates
  useEffect(() => {
    if (socket) {
      // Listen for traffic data updates
      socket.on('traffic-data', (data) => {
        setIntersections(data.intersections);
      });

      // Listen for simulation state changes
      socket.on('simulation-state', (state) => {
        console.log('Simulation state updated:', state);
      });

      // Listen for vehicle movement updates
      socket.on('vehicle-movement-completed', (data) => {
        // Refresh traffic data to show updated vehicle counts
        refetch();
      });

      // Listen for traffic cycle updates
      socket.on('traffic-cycle-completed', (data) => {
        // Refresh traffic data to show updated traffic lights
        refetch();
      });

      // Listen for system alerts
      socket.on('system-alert', (data) => {
        setAlerts(prev => [{ ...data, timestamp: new Date() }, ...prev].slice(0, 10));
      });

      // Listen for simulation started/stopped
      socket.on('simulation-started', (data) => {
        setAlerts(prev => [
          {
            type: 'info',
            message: 'Traffic simulation started via socket',
            timestamp: new Date()
          },
          ...prev
        ]);
      });

      socket.on('simulation-stopped', (data) => {
        setAlerts(prev => [
          {
            type: 'warning',
            message: 'Traffic simulation stopped via socket',
            timestamp: new Date()
          },
          ...prev
        ]);
      });
    }

    return () => {
      if (socket) {
        socket.off('traffic-data');
        socket.off('simulation-state');
        socket.off('vehicle-movement-completed');
        socket.off('traffic-cycle-completed');
        socket.off('system-alert');
        socket.off('simulation-started');
        socket.off('simulation-stopped');
      }
    };
  }, [socket, refetch]);

  // Handle system alerts from socket
  useEffect(() => {
    if (lastSystemAlert) {
      setAlerts(prev => [{ ...lastSystemAlert, timestamp: new Date() }, ...prev].slice(0, 10));
    }
  }, [lastSystemAlert]);

  // Auto-refresh traffic data less frequently since we have real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!simulationState?.isRunning) {
        refetch();
      }
    }, 10000); // Every 10 seconds instead of 5

    return () => clearInterval(interval);
  }, [refetch, simulationState]);

  // Request initial traffic data when connected
  useEffect(() => {
    if (connected && socket) {
      requestTrafficData();
    }
  }, [connected, socket, requestTrafficData]);

  const handleStartSimulation = () => {
    console.log('🚀 handleStartSimulation called');
    
    // Try socket-based simulation first
    if (connected && socket) {
      console.log('🚀 Using socket-based simulation');
      startSimulation();
    } else {
      console.log('🚀 Using HTTP-based simulation fallback');
      // Fallback to HTTP-based simulation
      startHttpSimulation();
    }
  };

  const startHttpSimulation = async () => {
    try {
      console.log('🌐 Starting HTTP-based traffic simulation...');
      
      // Add system alert
      setAlerts(prev => [
        {
          type: 'info',
          message: 'HTTP traffic simulation started',
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
            console.log(`HTTP Traffic cycle processed: ${result.updatedLights} lights updated`);
            refetch();
          }
        } catch (error) {
          console.error('Error in HTTP traffic cycle:', error);
        }
      }, 5000);

      // Start vehicle generation
      const vehicleGenInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/sensors/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              count: Math.floor(Math.random() * 2) + 1 // Generate 1-2 vehicles
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`HTTP Generated ${result.vehicles.length} vehicles`);
            refetch();
          }
        } catch (error) {
          console.error('Error in HTTP vehicle generation:', error);
        }
      }, 8000);

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
            console.log(`HTTP Vehicle movement: ${result.movedVehicles || 0} moved, ${result.exitedVehicles || 0} exited`);
            refetch();
          }
        } catch (error) {
          console.error('Error in HTTP vehicle movement:', error);
        }
      }, 2000);

      // Store intervals (we'll need to manage these differently)
      (window as any).httpSimulationIntervals = {
        cycle: cycleInterval,
        vehicleGen: vehicleGenInterval,
        vehicleMovement: vehicleMovementInterval
      };

      console.log('✅ HTTP simulation started');

    } catch (error) {
      console.error('Error starting HTTP simulation:', error);
    }
  };

  const handleStopSimulation = () => {
    console.log('🛑 handleStopSimulation called');
    
    // Try socket-based stop first
    if (connected && socket) {
      console.log('🛑 Using socket-based stop');
      stopSimulation();
    } else {
      console.log('🛑 Using HTTP-based stop fallback');
      stopHttpSimulation();
    }
  };

  const stopHttpSimulation = () => {
    console.log('🛑 Stopping HTTP-based traffic simulation...');
    
    const intervals = (window as any).httpSimulationIntervals;
    if (intervals) {
      if (intervals.cycle) clearInterval(intervals.cycle);
      if (intervals.vehicleGen) clearInterval(intervals.vehicleGen);
      if (intervals.vehicleMovement) clearInterval(intervals.vehicleMovement);
      delete (window as any).httpSimulationIntervals;
    }
    
    setAlerts(prev => [
      {
        type: 'warning',
        message: 'HTTP traffic simulation stopped',
        timestamp: new Date()
      },
      ...prev
    ]);
  };

  const handleResetSimulation = async () => {
    try {
      // Stop both socket and HTTP simulations
      if (connected && socket) {
        stopSimulation();
      }
      stopHttpSimulation();
      
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

      refetch();

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
                  onClick={handleStartSimulation}
                  disabled={simulationState?.isRunning}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Start</span>
                </Button>
                
                <Button
                  onClick={handleStopSimulation}
                  disabled={!simulationState?.isRunning}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Pause className="h-4 w-4" />
                  <span>Stop</span>
                </Button>
                
                <Button
                  onClick={handleResetSimulation}
                  disabled={simulationState?.isRunning}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </Button>

                <Button
                  onClick={() => {
                    console.log('🧪 Testing socket connection...');
                    console.log('Socket exists:', !!socket);
                    console.log('Connected:', connected);
                    console.log('Simulation state:', simulationState);
                    if (socket) {
                      console.log('Socket emit test...');
                      socket.emit('test', { message: 'Hello from client' });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <span>Test Socket</span>
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