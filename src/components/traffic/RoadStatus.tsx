'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RoadStatus, Direction } from '@/types/traffic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface RoadStatusProps {
  road: RoadStatus;
  showDetails?: boolean;
}

export const RoadStatusComponent: React.FC<RoadStatusProps> = ({
  road,
  showDetails = true
}) => {
  const { roadName, direction, vehicleCount, maxCapacity, congestionLevel, avgSpeed } = road;
  
  const capacityPercentage = (vehicleCount / maxCapacity) * 100;
  
  const getCongestionStatus = (level: number) => {
    if (level <= 0.3) return { status: 'Free Flow', color: 'bg-green-500', textColor: 'text-green-600', badge: 'default' };
    if (level <= 0.6) return { status: 'Moderate', color: 'bg-yellow-500', textColor: 'text-yellow-600', badge: 'secondary' };
    if (level <= 0.8) return { status: 'Congested', color: 'bg-orange-500', textColor: 'text-orange-600', badge: 'outline' };
    return { status: 'Heavy Traffic', color: 'bg-red-500', textColor: 'text-red-600', badge: 'destructive' };
  };

  const congestion = getCongestionStatus(congestionLevel);
  
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="text-xl">{getDirectionIcon(direction)}</span>
            {roadName}
          </CardTitle>
          <Badge variant={congestion.badge as any}>
            {congestion.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <motion.div
              key={vehicleCount}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold text-blue-600"
            >
              {vehicleCount}
            </motion.div>
            <div className="text-sm text-gray-500">Vehicles</div>
          </div>
          
          <div className="text-center">
            <motion.div
              key={avgSpeed}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold text-green-600"
            >
              {avgSpeed.toFixed(0)}
            </motion.div>
            <div className="text-sm text-gray-500">km/h</div>
          </div>
        </div>

        {/* Capacity Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Road Capacity</span>
            <span className="font-medium">{Math.round(capacityPercentage)}%</span>
          </div>
          <Progress value={capacityPercentage} className="h-3" />
          <div className="text-xs text-gray-500 text-center">
            {vehicleCount} of {maxCapacity} vehicles
          </div>
        </div>

        {/* Congestion Level */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Congestion Level</span>
            <span className={`font-medium ${congestion.textColor}`}>
              {Math.round(congestionLevel * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-full ${congestion.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${congestionLevel * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Additional Details */}
        {showDetails && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Direction:</span>
                <span className="font-medium">{direction}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Efficiency:</span>
                <span className="font-medium">
                  {Math.round((1 - congestionLevel) * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Flow Rate:</span>
                <span className="font-medium">
                  {(avgSpeed * (1 - congestionLevel)).toFixed(1)} v/h
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`font-medium ${congestion.textColor}`}>
                  {congestion.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};