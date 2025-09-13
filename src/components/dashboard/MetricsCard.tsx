'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  icon,
  color,
  trend
}) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <div className={color}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
        {trend && (
          <div className="flex items-center space-x-1 text-xs">
            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              from last hour
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};