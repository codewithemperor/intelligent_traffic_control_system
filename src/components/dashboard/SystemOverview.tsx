'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrafficLight, Status } from '@/types/traffic';
import { Activity, Zap, AlertTriangle, TrendingUp } from 'lucide-react';

interface SystemOverviewProps {
  trafficLights: TrafficLight[];
}

export const SystemOverview: React.FC<SystemOverviewProps> = ({
  trafficLights
}) => {
  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.RED:
      case Status.FLASHING_RED:
        return 'destructive';
      case Status.YELLOW:
      case Status.FLASHING_YELLOW:
        return 'secondary';
      case Status.GREEN:
        return 'default';
      case Status.MAINTENANCE:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusCount = (status: Status) => {
    return trafficLights.filter(light => light.status === status).length;
  };

  const totalVehicles = trafficLights.reduce((sum, light) => 
    sum + light.roads?.reduce((roadSum, road) => roadSum + road.vehicleCount, 0) || 0, 0
  );

  const totalCapacity = trafficLights.reduce((sum, light) => 
    sum + light.roads?.reduce((roadSum, road) => roadSum + road.maxCapacity, 0) || 0, 0
  );

  const averageCongestion = totalCapacity > 0 ? 
    trafficLights.reduce((sum, light) => 
      sum + light.roads?.reduce((roadSum, road) => roadSum + road.congestionLevel, 0) || 0, 0
    ) / trafficLights.reduce((sum, light) => sum + (light.roads?.length || 1), 0) : 0;

  const systemEfficiency = Math.round((1 - averageCongestion) * 100);

  const statusDistribution = [
    { status: Status.RED, count: getStatusCount(Status.RED), label: 'Red Lights' },
    { status: Status.GREEN, count: getStatusCount(Status.GREEN), label: 'Green Lights' },
    { status: Status.YELLOW, count: getStatusCount(Status.YELLOW), label: 'Yellow Lights' },
    { status: Status.MAINTENANCE, count: getStatusCount(Status.MAINTENANCE), label: 'Maintenance' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* System Status */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Efficiency */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">System Efficiency</span>
              <span className="text-lg font-bold text-green-600">{systemEfficiency}%</span>
            </div>
            <Progress value={systemEfficiency} className="h-3" />
          </div>

          {/* Vehicle Capacity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Vehicle Capacity</span>
              <span className="text-sm text-gray-600">
                {totalVehicles} / {totalCapacity}
              </span>
            </div>
            <Progress 
              value={totalCapacity > 0 ? (totalVehicles / totalCapacity) * 100 : 0} 
              className="h-3" 
            />
          </div>

          {/* Congestion Level */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Congestion</span>
              <span className="text-lg font-bold text-orange-600">
                {Math.round(averageCongestion * 100)}%
              </span>
            </div>
            <Progress value={averageCongestion * 100} className="h-3" />
          </div>

          {/* Status Distribution */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            {statusDistribution.map(({ status, count, label }) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <Badge variant={getStatusColor(status) as any}>
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Intersections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Active Intersections</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trafficLights.slice(0, 5).map((light) => (
              <motion.div
                key={light.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{light.name}</div>
                  <div className="text-xs text-gray-500">{light.location}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(light.status) as any} className="text-xs">
                    {light.status}
                  </Badge>
                  <div className="text-xs text-gray-500">
                    {light.roads?.reduce((sum, road) => sum + road.vehicleCount, 0) || 0} vehicles
                  </div>
                </div>
              </motion.div>
            ))}
            
            {trafficLights.length > 5 && (
              <div className="text-center pt-2">
                <span className="text-sm text-gray-500">
                  +{trafficLights.length - 5} more intersections
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>System Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {trafficLights.length}
              </div>
              <div className="text-sm text-gray-600">Total Lights</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {trafficLights.filter(light => light.isActive).length}
              </div>
              <div className="text-sm text-gray-600">Active Lights</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {totalVehicles}
              </div>
              <div className="text-sm text-gray-600">Total Vehicles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {trafficLights.reduce((sum, light) => sum + light.totalCycles, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Cycles</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};