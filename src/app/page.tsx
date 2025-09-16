'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/traffic/sidebar'
import { MobileControls } from '@/components/traffic/mobile-controls'
import { TrafficLightCard } from '@/components/traffic/traffic-light-card'
import { useTrafficStore } from '@/store/traffic-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { Skeleton } from '@/components/ui/skeleton'

// API functions
const fetchJunction = async () => {
  const response = await fetch('/api/junction')
  if (!response.ok) {
    throw new Error('Failed to fetch junction')
  }
  return response.json()
}

export default function Home() {
  const isMobile = useIsMobile()
  const { setJunction, isSimulationRunning, updateVehicleCount, changeLight, updateLightTime } = useTrafficStore()
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null)
  
  const { data: junction, isLoading, error, isError } = useQuery({
    queryKey: ['junction'],
    queryFn: fetchJunction,
    refetchInterval: 5000, // Refetch every 5 seconds
  })
  
  // Debug logging
  useEffect(() => {
    console.log('Debug:', { isLoading, isError, error, junction })
  }, [isLoading, isError, error, junction])
  
  // Initialize store with junction data
  useEffect(() => {
    if (junction) {
      console.log('Setting junction in store:', junction)
      setJunction(junction)
    }
  }, [junction, setJunction])
  
  // Get current junction from store for rendering
  const storeJunction = useTrafficStore(state => state.junction)
  
  // Simulation logic
  useEffect(() => {
    if (isSimulationRunning) {
      // Timer update interval (every 1 second for countdown)
      const timerInterval = setInterval(() => {
        const currentState = useTrafficStore.getState()
        const currentJunction = currentState.junction
        
        if (!currentJunction) return
        
        // Update traffic light timers with random logic
        currentJunction.roads.forEach(road => {
          const currentStatus = road.trafficLight.status
          const timing = road.trafficLight.timing
          const currentTimeLeft = currentState.currentLightStatus[road.id]?.timeLeft || timing.red
          
          // Random traffic light behavior
          if (currentStatus === 'GREEN') {
            // Green light timing
            const newTimeLeft = Math.max(0, currentTimeLeft - 1)
            updateLightTime(road.id, newTimeLeft)
            
            // Switch to yellow when time is up or randomly
            const shouldSwitch = newTimeLeft <= 0 || Math.random() < 0.02 // 2% chance per second
            if (shouldSwitch) {
              changeLight(road.id, 'YELLOW')
            }
          } else if (currentStatus === 'YELLOW') {
            // Yellow light timing
            const newTimeLeft = Math.max(0, currentTimeLeft - 1)
            updateLightTime(road.id, newTimeLeft)
            
            // Switch to red when time is up
            if (newTimeLeft <= 0) {
              changeLight(road.id, 'RED')
            }
          } else if (currentStatus === 'RED') {
            // Red light - randomly switch to green based on traffic and random chance
            const currentVehicleCount = road.vehicleCount
            const trafficPressure = currentVehicleCount / road.maxCapacity
            const randomChance = Math.random()
            
            // Higher chance to turn green if more vehicles are waiting
            const greenChance = 0.01 + (trafficPressure * 0.05) // 1% to 6% chance per second
            
            if (randomChance < greenChance) {
              // Check if too many roads are already green (max 2)
              const greenRoads = currentJunction.roads.filter(r => r.trafficLight.status === 'GREEN')
              if (greenRoads.length < 2) {
                changeLight(road.id, 'GREEN')
              }
            }
            
            // Update timer display
            updateLightTime(road.id, timing.red)
          }
        })
      }, 1000) // Timer updates every 1 second
      
      // Vehicle count update interval (every 3 seconds)
      const vehicleInterval = setInterval(() => {
        const currentState = useTrafficStore.getState()
        const currentJunction = currentState.junction
        
        if (!currentJunction) return
        
        // Update vehicle counts based on traffic light status (every 3 seconds)
        currentJunction.roads.forEach(road => {
          const currentStatus = road.trafficLight.status
          let newCount = road.vehicleCount
          
          switch (currentStatus) {
            case 'GREEN':
              // REALISTIC: Remove 2-5 cars every 3 seconds (steady traffic flow)
              const deduction = Math.floor(Math.random() * 4) + 2 // Random between 2-5
              newCount = Math.max(0, road.vehicleCount - deduction)
              console.log(`GREEN LIGHT: ${road.name} - Removing ${deduction} cars (${road.vehicleCount} → ${newCount})`)
              break
            case 'YELLOW':
              // REALISTIC: Add 0-2 cars every 3 seconds (some cars stopping, few joining)
              const yellowAddition = Math.floor(Math.random() * 3) // Random between 0-2
              newCount = Math.min(road.maxCapacity, road.vehicleCount + yellowAddition)
              break
            case 'RED':
              // REALISTIC: Add 1-3 cars every 3 seconds (gradual accumulation at red light)
              const redAddition = Math.floor(Math.random() * 3) + 1 // Random between 1-3
              newCount = Math.min(road.maxCapacity, road.vehicleCount + redAddition)
              break
          }
          
          if (newCount !== road.vehicleCount) {
            updateVehicleCount(road.id, newCount)
          }
        })
      }, 4000) // Vehicle updates every 3 seconds
      
      // Store both intervals for cleanup
      setSimulationInterval(timerInterval)
      
      // Cleanup function
      return () => {
        clearInterval(timerInterval)
        clearInterval(vehicleInterval)
      }
    } else {
      if (simulationInterval) {
        clearInterval(simulationInterval)
        setSimulationInterval(null)
      }
    }
  }, [isSimulationRunning, updateVehicleCount, changeLight, updateLightTime])
  
  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        {!isMobile && <div className="w-80 bg-white border-r border-gray-200 p-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-40 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>}
        <main className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </main>
        {isMobile && (
          <div className="lg:hidden border-t border-gray-200 p-4">
            <Skeleton className="h-20 w-full" />
          </div>
        )}
      </div>
    )
  }
  
  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Traffic System</h1>
          <p className="text-gray-600">Please try refreshing the page</p>
          <p className="text-sm text-gray-500 mt-2">Error: {error?.message}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}
      
      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Traffic Control Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor and control traffic flow at Adeseun Ogundoyin Polytechnic</p>
          </div>
          
          {storeJunction && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {storeJunction.roads.map((road) => (
                <TrafficLightCard key={road.id} road={road} />
              ))}
            </div>
          )}
          
          {!storeJunction && !isLoading && !isError && (
            <div className="text-center py-12">
              <p className="text-gray-500">No junction data available</p>
            </div>
          )}
        </div>
      </main>
      
      {/* Mobile Controls */}
      {isMobile && <MobileControls />}
    </div>
  )
}