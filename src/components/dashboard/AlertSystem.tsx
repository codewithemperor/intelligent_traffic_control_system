'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, X, Clock } from 'lucide-react';

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  lightId?: string;
}

interface AlertSystemProps {
  alerts: Alert[];
}

export const AlertSystem: React.FC<AlertSystemProps> = ({
  alerts
}) => {
  const [visibleAlerts, setVisibleAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Filter out dismissed alerts
    const newAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id || alert.message));
    setVisibleAlerts(newAlerts.slice(0, 5)); // Show only last 5 alerts
  }, [alerts, dismissedAlerts]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  const clearAllAlerts = () => {
    alerts.forEach(alert => {
      if (alert.id) {
        setDismissedAlerts(prev => new Set(prev).add(alert.id));
      }
    });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'info':
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
    }
  };

  const getAlertBadgeColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
      default:
        return 'default';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>System Alerts</span>
            <Badge variant="outline">
              {visibleAlerts.length}
            </Badge>
          </CardTitle>
          {visibleAlerts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllAlerts}
              className="text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {visibleAlerts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="text-gray-400 mb-2">
                  <AlertTriangle className="h-8 w-8 mx-auto" />
                </div>
                <p className="text-sm text-gray-500">No active alerts</p>
                <p className="text-xs text-gray-400">System is running normally</p>
              </motion.div>
            ) : (
              visibleAlerts.map((alert, index) => (
                <motion.div
                  key={alert.id || alert.message || index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ duration: 0.3 }}
                  className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={getAlertBadgeColor(alert.type) as any} className="text-xs">
                            {alert.type.toUpperCase()}
                          </Badge>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeAgo(alert.timestamp)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {alert.message}
                        </p>
                        {alert.lightId && (
                          <p className="text-xs text-gray-500 mt-1">
                            Intersection: {alert.lightId}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id || alert.message || index.toString())}
                      className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};