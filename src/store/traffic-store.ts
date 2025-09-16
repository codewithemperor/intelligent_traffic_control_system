import { create } from 'zustand'
import { Status, Direction } from '@prisma/client'

export interface RoadData {
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

export interface JunctionData {
  id: string
  name: string
  location: string
  isActive: boolean
  roads: RoadData[]
}

interface TrafficState {
  junction: JunctionData | null
  isSimulationRunning: boolean
  currentLightTime: number
  currentLightStatus: { [roadId: string]: { status: Status; timeLeft: number } }
  
  // Actions
  setJunction: (junction: JunctionData) => void
  startSimulation: () => void
  stopSimulation: () => void
  updateVehicleCount: (roadId: string, count: number) => void
  changeLight: (roadId: string, status: Status) => void
  updateLightTime: (roadId: string, timeLeft: number) => void
  resetSimulation: () => void
}

export const useTrafficStore = create<TrafficState>((set, get) => ({
  junction: null,
  isSimulationRunning: false,
  currentLightTime: 0,
  currentLightStatus: {},
  
  setJunction: (junction) => {
    set({ 
      junction,
      currentLightStatus: junction.roads.reduce((acc, road) => {
        acc[road.id] = { status: road.trafficLight.status, timeLeft: road.trafficLight.timing.red }
        return acc
      }, {} as { [roadId: string]: { status: Status; timeLeft: number } })
    })
  },
  
  startSimulation: () => {
    set((state) => {
      if (state.junction) {
        // Initialize random traffic light states when starting simulation
        const updatedRoads = state.junction.roads.map(road => {
          const randomStatus = Math.random() < 0.3 ? 'GREEN' : 'RED' // 30% chance to start green
          return {
            ...road,
            trafficLight: {
              ...road.trafficLight,
              status: randomStatus
            }
          }
        })
        
        // Ensure not too many roads are green at start (max 2)
        const greenRoads = updatedRoads.filter(r => r.trafficLight.status === 'GREEN')
        if (greenRoads.length > 2) {
          // Turn excess green roads to red
          updatedRoads.forEach((road, index) => {
            if (road.trafficLight.status === 'GREEN' && index >= 2) {
              road.trafficLight.status = 'RED'
            }
          })
        }
        
        return {
          isSimulationRunning: true,
          junction: {
            ...state.junction!,
            roads: updatedRoads
          },
          currentLightStatus: updatedRoads.reduce((acc, road) => {
            const timing = road.trafficLight.timing
            const initialTime = road.trafficLight.status === 'GREEN' ? timing.green : timing.red
            acc[road.id] = { status: road.trafficLight.status, timeLeft: initialTime }
            return acc
          }, {} as { [roadId: string]: { status: Status; timeLeft: number } })
        }
      }
      return { isSimulationRunning: true }
    })
  },
  
  stopSimulation: () => set({ isSimulationRunning: false }),
  
  updateVehicleCount: (roadId, count) => {
    set((state) => ({
      junction: state.junction
        ? {
            ...state.junction,
            roads: state.junction.roads.map((road) =>
              road.id === roadId ? { ...road, vehicleCount: Math.max(0, Math.min(count, road.maxCapacity)) } : road
            ),
          }
        : null,
    }))
  },
  
  changeLight: (roadId, status) => {
    set((state) => ({
      junction: state.junction
        ? {
            ...state.junction,
            roads: state.junction.roads.map((road) =>
              road.id === roadId
                ? { ...road, trafficLight: { ...road.trafficLight, status } }
                : road
            ),
          }
        : null,
      currentLightStatus: {
        ...state.currentLightStatus,
        [roadId]: { 
          status, 
          timeLeft: state.junction?.roads.find(r => r.id === roadId)?.trafficLight.timing[status.toLowerCase() as keyof typeof timing] || 30 
        }
      }
    }))
  },
  
  updateLightTime: (roadId, timeLeft) => {
    set((state) => ({
      currentLightStatus: {
        ...state.currentLightStatus,
        [roadId]: {
          ...state.currentLightStatus[roadId],
          timeLeft
        }
      }
    }))
  },
  
  resetSimulation: () => {
    const state = get()
    if (state.junction) {
      set({
        isSimulationRunning: false,
        currentLightTime: 0,
        currentLightStatus: state.junction.roads.reduce((acc, road) => {
          acc[road.id] = { status: road.trafficLight.status, timeLeft: road.trafficLight.timing.red }
          return acc
        }, {} as { [roadId: string]: { status: Status; timeLeft: number } })
      })
    }
  }
}))