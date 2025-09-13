'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RoadStatus, Direction } from '@/types/traffic';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

type VehicleCounterProps = RoadStatus;

export const VehicleCounter: React.FC<VehicleCounterProps> = ({
  roadName,
  direction,
  vehicleCount,
  maxCapacity,
  congestionLevel,
  avgSpeed
}) => {
  const capacityPercentage = (vehicleCount / maxCapacity) * 100;
  
  const getCongestionStatus = (level: number) => {
    if (level <= 0.3) return { status: 'Low', color: 'bg-green-500', textColor: 'text-green-600' };
    if (level <= 0.6) return { status: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    if (level <= 0.8) return { status: 'High', color: 'bg-orange-500', textColor: 'text-orange-600' };
    return { status: 'Critical', color: 'bg-red-500', textColor: 'text-red-600' };
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
    <div className="space-y-3">
      {/* Vehicle Count Display */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            {vehicleCount}
          </span>
          <span className="text-sm text-gray-500">vehicles</span>
        </div>
        <Badge 
          variant="outline" 
          className={`${congestion.textColor} border-current`}
        >
          {congestion.status}
        </Badge>
      </div>

      {/* Capacity Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Road Capacity</span>
          <span>{Math.round(capacityPercentage)}%</span>
        </div>
        <Progress 
          value={capacityPercentage} 
          className="h-2"
        />
        <div className="text-xs text-gray-500">
          {vehicleCount} / {maxCapacity} vehicles
        </div>
      </div>

      {/* Speed Indicator */}
      <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm">Avg Speed:</span>
          <motion.span
            key={avgSpeed}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-semibold"
          >
            {avgSpeed.toFixed(1)} km/h
          </motion.span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">{getDirectionIcon(direction)}</span>
          <span className="text-xs text-gray-500">{direction}</span>
        </div>
      </div>

      {/* Congestion Visual Indicator */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${congestion.color}`}
            initial={{ width: 0 }}
            animate={{ width: `${congestionLevel * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          Congestion
        </span>
      </div>
    </div>
  );
};