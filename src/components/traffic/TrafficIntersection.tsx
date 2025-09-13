'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Status, Direction } from '@/types/traffic';
import { TrafficLight } from './TrafficLight';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VehicleCounter } from './VehicleCounter';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface TrafficIntersectionProps {
  intersection: any;
  onManualOverride?: (id: string, status: Status) => void;
  onEmergencyMode?: (id: string) => void;
  countdown?: number;
}

export const TrafficIntersection: React.FC<TrafficIntersectionProps> = ({
  intersection,
  onManualOverride,
  onEmergencyMode,
  countdown
}) => {
  const { id, name, location, isActive, algorithm, priority, trafficLights = [], roads = [] } = intersection;

  const getDirectionIcon = (direction: Direction) => {
    switch (direction) {
      case Direction.NORTH: return '↑';
      case Direction.SOUTH: return '↓';
      case Direction.EAST: return '→';
      case Direction.WEST: return '←';
      case Direction.NORTHEAST: return '↗';
      case Direction.NORTHWEST: return '↖';
      case Direction.SOUTHEAST: return '↘';
      case Direction.SOUTHWEST: return '↙';
      default: return '•';
    }
  };

  const getCongestionColor = (level: number) => {
    if (level <= 0.3) return 'text-green-600';
    if (level <= 0.6) return 'text-yellow-600';
    if (level <= 0.8) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.GREEN: return 'text-green-600 bg-green-50 border-green-200';
      case Status.YELLOW: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case Status.RED: return 'text-red-600 bg-red-50 border-red-200';
      case Status.FLASHING_RED: return 'text-red-600 bg-red-50 border-red-200';
      case Status.FLASHING_YELLOW: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case Status.MAINTENANCE: return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const totalVehicles = roads.reduce((sum, road) => sum + road.vehicleCount, 0);
  const totalCapacity = roads.reduce((sum, road) => sum + road.maxCapacity, 0);
  const averageCongestion = roads.length > 0 ? 
    roads.reduce((sum, road) => sum + road.congestionLevel, 0) / roads.length : 0;

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold">{name}</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">{location}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">
              Priority {priority}
            </Badge>
            <Badge variant="outline">
              {algorithm}
            </Badge>
            {onEmergencyMode && (
              <Button
                onClick={() => onEmergencyMode(id)}
                variant="destructive"
                size="sm"
                className="flex items-center gap-1"
              >
                <AlertTriangle className="h-4 w-4" />
                Emergency
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Traffic Lights */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Traffic Lights</h3>
              <div className="grid grid-cols-2 gap-4">
                {trafficLights.map((light: any) => (
                  <motion.div
                    key={light.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center"
                  >
                    <TrafficLight
                      id={light.id}
                      name={light.road?.name || `Light ${light.id.slice(-4)}`}
                      status={light.status}
                      timing={light.timing}
                      vehicleCount={light.road?.vehicleCount || 0}
                      isManual={!!onManualOverride}
                      onManualOverride={onManualOverride}
                      countdown={countdown}
                      compact={true}
                    />
                    <div className="mt-2 text-xs text-center">
                      <div className="font-medium">{light.road?.name || 'Unknown'}</div>
                      <div className="text-gray-500">{getDirectionIcon(light.road?.direction)}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Roads Display */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Roads & Traffic</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roads.map((road: any) => {
                  const correspondingLight = trafficLights.find((light: any) => light.roadId === road.id);
                  return (
                    <motion.div
                      key={road.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {getDirectionIcon(road.direction)}
                          </span>
                          <span className="font-medium text-sm">{road.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge 
                            variant="outline" 
                            className={getCongestionColor(road.congestionLevel)}
                          >
                            {Math.round(road.congestionLevel * 100)}%
                          </Badge>
                          {correspondingLight && (
                            <Badge 
                              variant="outline"
                              className={getStatusColor(correspondingLight.status)}
                            >
                              {correspondingLight.status}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <VehicleCounter
                        roadName={road.name}
                        direction={road.direction}
                        vehicleCount={road.vehicleCount}
                        maxCapacity={road.maxCapacity}
                        congestionLevel={road.congestionLevel}
                        avgSpeed={road.averageSpeed}
                      />

                      <div className="mt-3 text-xs text-gray-500 grid grid-cols-2 gap-2">
                        <div>
                          <div className="font-semibold">Capacity</div>
                          <div>{road.vehicleCount}/{road.maxCapacity}</div>
                        </div>
                        <div>
                          <div className="font-semibold">Avg Speed</div>
                          <div>{road.averageSpeed.toFixed(1)} km/h</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Intersection Info */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">Traffic Lights</div>
              <div className="text-2xl font-bold text-blue-600">{trafficLights.length}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Total Vehicles</div>
              <div className="text-xl font-bold text-green-600">{totalVehicles}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Congestion</div>
              <div className="text-lg font-bold text-orange-600">
                {Math.round(averageCongestion * 100)}%
              </div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Algorithm</div>
              <div className="text-sm text-gray-600">{algorithm}</div>
            </div>
          </div>
        </div>

        {/* Current Phase Info */}
        {intersection.phases && intersection.phases.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold mb-2">Active Phases</h4>
            <div className="flex flex-wrap gap-2">
              {intersection.phases.map((phase: any) => (
                <Badge key={phase.id} variant="outline" className="text-xs">
                  {phase.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};