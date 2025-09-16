'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTrafficStore } from '@/store/traffic-store'
import { Play, Pause, RotateCcw, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

export function MobileControls() {
  const { 
    junction, 
    isSimulationRunning, 
    startSimulation, 
    stopSimulation, 
    resetSimulation 
  } = useTrafficStore()
  
  const totalVehicles = junction?.roads.reduce((sum, road) => sum + road.vehicleCount, 0) || 0
  const totalCapacity = junction?.roads.reduce((sum, road) => sum + road.maxCapacity, 0) || 0
  const occupancyRate = totalCapacity > 0 ? (totalVehicles / totalCapacity) * 100 : 0
  
  return (
    <div className="bg-white border-t border-gray-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Traffic Control</h2>
          <p className="text-sm text-gray-600">Adeseun Ogundoyin Polytechnic</p>
        </div>
        <Badge variant={isSimulationRunning ? 'default' : 'secondary'}>
          {isSimulationRunning ? 'Running' : 'Stopped'}
        </Badge>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">{totalVehicles}</div>
          <div className="text-xs text-gray-600">Vehicles</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">{occupancyRate.toFixed(0)}%</div>
          <div className="text-xs text-gray-600">Occupancy</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-purple-600">{junction?.roads.length || 0}</div>
          <div className="text-xs text-gray-600">Roads</div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button
            onClick={isSimulationRunning ? stopSimulation : startSimulation}
            variant={isSimulationRunning ? 'destructive' : 'default'}
            className="flex-1"
            size="sm"
          >
            {isSimulationRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start
              </>
            )}
          </Button>
          
          <Button
            onClick={resetSimulation}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Manual Override Notice */}
        <div className="text-center text-xs text-gray-500">
          💡 Tap traffic light cards for manual override
        </div>
      </div>
    </div>
  )
}