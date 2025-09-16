'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTrafficStore } from '@/store/traffic-store'
import { Play, Pause, RotateCcw, Settings, BarChart3, Route } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export function Sidebar() {
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
  
  const getActiveRoads = () => {
    return junction?.roads.filter(road => road.trafficLight.status === 'GREEN') || []
  }
  
  const getCongestedRoads = () => {
    return junction?.roads.filter(road => road.vehicleCount > road.maxCapacity * 0.8) || []
  }
  
  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Traffic Control</h1>
        <p className="text-sm text-gray-600">Adeseun Ogundoyin Polytechnic</p>
      </div>
      
      {/* Junction Info */}
      {junction && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Junction Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">{junction.name}</p>
              <p className="text-sm text-gray-600">{junction.location}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={junction.isActive ? 'default' : 'secondary'}>
                {junction.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Simulation Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Simulation Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
          
          <div className="text-center">
            <Badge variant={isSimulationRunning ? 'default' : 'secondary'}>
              {isSimulationRunning ? 'Running' : 'Stopped'}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalVehicles}</div>
              <div className="text-xs text-gray-600">Total Vehicles</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{occupancyRate.toFixed(0)}%</div>
              <div className="text-xs text-gray-600">Occupancy</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Roads:</span>
              <Badge variant="outline">{getActiveRoads().length}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Congested Roads:</span>
              <Badge variant="destructive">{getCongestedRoads().length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Simulation</span>
              <div className={`w-2 h-2 rounded-full ${isSimulationRunning ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/roads">
            <Button variant="outline" className="w-full justify-start">
              <Route className="w-4 h-4 mr-2" />
              Manage Roads
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}