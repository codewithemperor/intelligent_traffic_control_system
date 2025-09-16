'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTrafficStore } from '@/store/traffic-store'
import { Status, Direction } from '@prisma/client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface TrafficLightCardProps {
  road: {
    id: string
    name: string
    direction: Direction
    vehicleCount: number
    maxCapacity: number
    trafficLight: {
      id: string
      status: Status
      timing: {
        red: number
        yellow: number
        green: number
      }
      priority: number
    }
  }
}

export function TrafficLightCard({ road: initialRoad }: TrafficLightCardProps) {
  const { currentLightStatus, junction, changeLight } = useTrafficStore()
  const [isHovered, setIsHovered] = useState(false)
  
  // Get the current road data from the store instead of props
  const currentRoad = junction?.roads.find(r => r.id === initialRoad.id) || initialRoad
  
  const lightStatus = currentLightStatus[currentRoad.id] || { 
    status: currentRoad.trafficLight.status, 
    timeLeft: currentRoad.trafficLight.timing.red 
  }
  const vehiclePercentage = (currentRoad.vehicleCount / currentRoad.maxCapacity) * 100
  
  const getLightColor = (status: Status) => {
    switch (status) {
      case 'RED':
        return 'bg-red-500'
      case 'YELLOW':
        return 'bg-yellow-500'
      case 'GREEN':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }
  
  const getLightGlow = (status: Status) => {
    switch (status) {
      case 'RED':
        return 'shadow-red-500/50'
      case 'YELLOW':
        return 'shadow-yellow-500/50'
      case 'GREEN':
        return 'shadow-green-500/50'
      default:
        return 'shadow-gray-500/50'
    }
  }
  
  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'RED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'YELLOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'GREEN':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const getDirectionIcon = (direction: Direction) => {
    switch (direction) {
      case 'NORTH':
        return '⬆️'
      case 'SOUTH':
        return '⬇️'
      case 'EAST':
        return '➡️'
      default:
        return '🛣️'
    }
  }
  
  const getVehicleEmoji = (count: number) => {
    const emojiCount = Math.min(count, 10)
    return '🚗'.repeat(emojiCount)
  }
  
  const handleManualOverride = (newStatus: Status) => {
    changeLight(currentRoad.id, newStatus)
  }
  
  return (
    <Card 
      className="w-full transition-all duration-300 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getDirectionIcon(currentRoad.direction)}</span>
            <span>{currentRoad.name}</span>
          </div>
          <Badge className={getStatusColor(lightStatus.status)}>
            {lightStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Traffic Light */}
        <div className="flex justify-center">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <div className="flex flex-col gap-3">
              {/* Red Light */}
              <div className={`w-16 h-16 rounded-full border-4 border-gray-700 transition-all duration-300 ${
                lightStatus.status === 'RED' 
                  ? 'bg-red-500 shadow-red-500/50 shadow-lg' 
                  : 'bg-red-900/30'
              }`} />
              
              {/* Yellow Light */}
              <div className={`w-16 h-16 rounded-full border-4 border-gray-700 transition-all duration-300 ${
                lightStatus.status === 'YELLOW' 
                  ? 'bg-yellow-500 shadow-yellow-500/50 shadow-lg' 
                  : 'bg-yellow-900/30'
              }`} />
              
              {/* Green Light */}
              <div className={`w-16 h-16 rounded-full border-4 border-gray-700 transition-all duration-300 ${
                lightStatus.status === 'GREEN' 
                  ? 'bg-green-500 shadow-green-500/50 shadow-lg animate-pulse' 
                  : 'bg-green-900/30'
              }`} />
            </div>
          </div>
        </div>
        
        {/* Timer */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">
            {lightStatus.timeLeft}s
          </div>
          <div className="text-sm text-gray-500">
            {lightStatus.status.toLowerCase()}
          </div>
          {/* Car count display */}
          <div className="mt-2 p-2 bg-gray-100 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              🚗 {currentRoad.vehicleCount}
            </div>
            <div className="text-xs text-gray-600">
              vehicles
            </div>
          </div>
        </div>
        
        {/* Vehicle Counter */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Vehicles</span>
            <span className="text-sm text-gray-600">
              {currentRoad.vehicleCount}/{currentRoad.maxCapacity}
            </span>
          </div>
          
          <Progress value={vehiclePercentage} className="h-2" />
          
          <div className="text-center text-lg">
            {getVehicleEmoji(currentRoad.vehicleCount)}
          </div>
        </div>
        
        {/* Manual Override Controls (shown on hover) */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-2 justify-center pt-2 border-t"
          >
            <button
              onClick={() => handleManualOverride('RED')}
              className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
            >
              Red
            </button>
            <button
              onClick={() => handleManualOverride('YELLOW')}
              className="px-3 py-1 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600 transition-colors"
            >
              Yellow
            </button>
            <button
              onClick={() => handleManualOverride('GREEN')}
              className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors"
            >
              Green
            </button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}