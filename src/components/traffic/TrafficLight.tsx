'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Status } from '@/types/traffic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_COLORS } from '@/constants/traffic-config';

interface TrafficLightProps {
  id: string;
  name: string;
  status: Status;
  timing: any;
  vehicleCount: number;
  isManual?: boolean;
  onManualOverride?: (id: string, status: Status) => void;
  countdown?: number;
  compact?: boolean;
}

export const TrafficLight: React.FC<TrafficLightProps> = ({
  id,
  name,
  status,
  timing,
  vehicleCount,
  isManual = false,
  onManualOverride,
  countdown = 0,
  compact = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getLightClass = (lightStatus: Status, compactMode = false) => {
    const sizeClass = compactMode ? "w-8 h-8" : "w-16 h-16";
    const baseClass = `${sizeClass} rounded-full border-2 border-gray-800 transition-all duration-300`;
    const activeClass = status === lightStatus 
      ? `${STATUS_COLORS[lightStatus]} shadow-lg scale-110` 
      : "bg-gray-700 opacity-30";
    
    return `${baseClass} ${activeClass}`;
  };

  const getStatusText = (status: Status) => {
    switch (status) {
      case Status.RED: return 'STOP';
      case Status.YELLOW: return 'WAIT';
      case Status.GREEN: return 'GO';
      case Status.FLASHING_RED: return 'FLASHING STOP';
      case Status.FLASHING_YELLOW: return 'FLASHING WAIT';
      case Status.MAINTENANCE: return 'MAINTENANCE';
      default: return status;
    }
  };

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

  if (compact) {
    return (
      <div className="flex flex-col items-center space-y-2">
        {/* Compact Traffic Light */}
        <div className="traffic-light bg-gradient-to-b from-gray-900 to-gray-800 p-2 rounded-lg shadow-lg border border-gray-700">
          <div className="space-y-1">
            {/* Red Light */}
            <motion.div
              className={getLightClass(Status.RED, true)}
              animate={status === Status.RED || status === Status.FLASHING_RED ? {
                boxShadow: [
                  "0 0 10px rgba(239, 68, 68, 0.8)",
                  "0 0 15px rgba(239, 68, 68, 1)",
                  "0 0 10px rgba(239, 68, 68, 0.8)"
                ]
              } : {}}
              transition={status === Status.FLASHING_RED ? {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            />
            
            {/* Yellow Light */}
            <motion.div
              className={getLightClass(Status.YELLOW, true)}
              animate={status === Status.YELLOW || status === Status.FLASHING_YELLOW ? {
                boxShadow: [
                  "0 0 10px rgba(245, 158, 11, 0.8)",
                  "0 0 15px rgba(245, 158, 11, 1)",
                  "0 0 10px rgba(245, 158, 11, 0.8)"
                ]
              } : {}}
              transition={status === Status.FLASHING_YELLOW ? {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            />
            
            {/* Green Light */}
            <motion.div
              className={getLightClass(Status.GREEN, true)}
              animate={status === Status.GREEN ? {
                boxShadow: [
                  "0 0 10px rgba(34, 197, 94, 0.8)",
                  "0 0 15px rgba(34, 197, 94, 1)",
                  "0 0 10px rgba(34, 197, 94, 0.8)"
                ]
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </div>

        {/* Status Badge */}
        <Badge variant={getStatusColor(status)} className="text-xs font-medium">
          {getStatusText(status)}
        </Badge>

        {/* Vehicle Count */}
        {vehicleCount > 0 && (
          <div className="text-xs text-gray-600">
            {vehicleCount} vehicles
          </div>
        )}
      </div>
    );
  }

  return (
    <Card 
      className="w-full max-w-sm mx-auto overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-center">{name}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Traffic Light Container */}
        <div className="flex justify-center">
          <div className="traffic-light bg-gradient-to-b from-gray-900 to-gray-800 p-4 rounded-xl shadow-2xl border-2 border-gray-700">
            {/* Red Light */}
            <motion.div
              className={getLightClass(Status.RED)}
              animate={status === Status.RED || status === Status.FLASHING_RED ? {
                boxShadow: [
                  "0 0 20px rgba(239, 68, 68, 0.8)",
                  "0 0 30px rgba(239, 68, 68, 1)",
                  "0 0 20px rgba(239, 68, 68, 0.8)"
                ]
              } : {}}
              transition={status === Status.FLASHING_RED ? {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            />
            
            {/* Yellow Light */}
            <motion.div
              className={getLightClass(Status.YELLOW)}
              animate={status === Status.YELLOW || status === Status.FLASHING_YELLOW ? {
                boxShadow: [
                  "0 0 20px rgba(245, 158, 11, 0.8)",
                  "0 0 30px rgba(245, 158, 11, 1)",
                  "0 0 20px rgba(245, 158, 11, 0.8)"
                ]
              } : {}}
              transition={status === Status.FLASHING_YELLOW ? {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            />
            
            {/* Green Light */}
            <motion.div
              className={getLightClass(Status.GREEN)}
              animate={status === Status.GREEN ? {
                boxShadow: [
                  "0 0 20px rgba(34, 197, 94, 0.8)",
                  "0 0 30px rgba(34, 197, 94, 1)",
                  "0 0 20px rgba(34, 197, 94, 0.8)"
                ]
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge variant={getStatusColor(status)} className="text-sm font-medium">
            {getStatusText(status)}
          </Badge>
        </div>

        {/* Countdown Timer */}
        {countdown > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              {countdown}s
            </div>
            <div className="text-sm text-gray-500">remaining</div>
          </div>
        )}

        {/* Vehicle Count */}
        <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
          <span className="text-sm font-medium">Vehicles:</span>
          <Badge variant="outline" className="text-sm">
            {vehicleCount}
          </Badge>
        </div>

        {/* Manual Override Controls */}
        {isManual && onManualOverride && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: isHovered ? 1 : 0, 
              height: isHovered ? 'auto' : 0 
            }}
            className="space-y-2 overflow-hidden"
          >
            <div className="text-sm font-medium text-center mb-2">Manual Override</div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onManualOverride(id, Status.RED)}
                className="text-xs"
              >
                Red
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onManualOverride(id, Status.YELLOW)}
                className="text-xs"
              >
                Yellow
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => onManualOverride(id, Status.GREEN)}
                className="text-xs"
              >
                Green
              </Button>
            </div>
          </motion.div>
        )}

        {/* Timing Info */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <div>Red: {timing.red}s | Yellow: {timing.yellow}s | Green: {timing.green}s</div>
          <div>Total Cycle: {timing.cycle}s</div>
        </div>
      </CardContent>
    </Card>
  );
};