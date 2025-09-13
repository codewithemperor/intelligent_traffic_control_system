'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrafficLight as TrafficLightType, Road, Status, Direction } from '@/types/traffic';
import { TrafficLight } from './TrafficLight';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VehicleCounter } from './VehicleCounter';

interface TrafficIntersectionProps {
  intersection: TrafficLightType;
  onManualOverride?: (id: string, status: Status) => void;
  countdown?: number;
}

export const TrafficIntersection: React.FC<TrafficIntersectionProps> = ({
  intersection,
  onManualOverride,
  countdown
}) => {
  const { id, name, location, status, timing, roads = [], isActive } = intersection;

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

  return (
    <Card className="w-full max-w-4xl mx-auto">
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
              Priority {intersection.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Traffic Light */}
          <div className="lg:col-span-1">
            <TrafficLight
              id={id}
              name={name}
              status={status}
              timing={timing}
              vehicleCount={roads.reduce((sum, road) => sum + road.vehicleCount, 0)}
              isManual={!!onManualOverride}
              onManualOverride={onManualOverride}
              countdown={countdown}
            />
          </div>

          {/* Roads Display */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              {roads.map((road) => (
                <motion.div
                  key={road.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {getDirectionIcon(road.direction)}
                      </span>
                      <span className="font-medium text-sm">{road.name}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={getCongestionColor(road.congestionLevel)}
                    >
                      {Math.round(road.congestionLevel * 100)}%
                    </Badge>
                  </div>

                  <VehicleCounter
                    roadName={road.name}
                    direction={road.direction}
                    vehicleCount={road.vehicleCount}
                    maxCapacity={road.maxCapacity}
                    congestionLevel={road.congestionLevel}
                    avgSpeed={road.averageSpeed}
                  />

                  <div className="mt-3 text-xs text-gray-500">
                    <div>Capacity: {road.vehicleCount}/{road.maxCapacity}</div>
                    <div>Avg Speed: {road.averageSpeed.toFixed(1)} km/h</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Intersection Info */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">Total Cycles</div>
              <div className="text-2xl font-bold text-blue-600">{intersection.totalCycles}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Algorithm</div>
              <div className="text-sm text-gray-600">{intersection.algorithm}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Last Changed</div>
              <div className="text-xs text-gray-500">
                {new Date(intersection.lastChanged).toLocaleTimeString()}
              </div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Total Vehicles</div>
              <div className="text-xl font-bold text-green-600">
                {roads.reduce((sum, road) => sum + road.vehicleCount, 0)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};