import { create } from 'zustand';
import { TrafficLight, Status, Algorithm } from '@/types/traffic';

interface TrafficStore {
  // State
  trafficLights: TrafficLight[];
  selectedLight: string | null;
  isSimulationRunning: boolean;
  systemStatus: {
    totalLights: number;
    activeLights: number;
    totalVehicles: number;
    averageCongestion: number;
    systemEfficiency: number;
  };
  
  // Actions
  setTrafficLights: (lights: TrafficLight[]) => void;
  updateTrafficLight: (id: string, updates: Partial<TrafficLight>) => void;
  selectLight: (id: string | null) => void;
  setSimulationRunning: (running: boolean) => void;
  updateSystemStatus: (status: Partial<TrafficStore['systemStatus']>) => void;
  
  // Computed
  getLightById: (id: string) => TrafficLight | undefined;
  getActiveLights: () => TrafficLight[];
  getTotalVehicles: () => number;
  getAverageCongestion: () => number;
}

export const useTrafficStore = create<TrafficStore>((set, get) => ({
  // Initial state
  trafficLights: [],
  selectedLight: null,
  isSimulationRunning: false,
  systemStatus: {
    totalLights: 0,
    activeLights: 0,
    totalVehicles: 0,
    averageCongestion: 0,
    systemEfficiency: 0
  },

  // Actions
  setTrafficLights: (lights) => 
    set({ trafficLights: lights }),

  updateTrafficLight: (id, updates) => 
    set((state) => ({
      trafficLights: state.trafficLights.map(light => 
        light.id === id ? { ...light, ...updates } : light
      )
    })),

  selectLight: (id) => 
    set({ selectedLight: id }),

  setSimulationRunning: (running) => 
    set({ isSimulationRunning: running }),

  updateSystemStatus: (status) => 
    set((state) => ({
      systemStatus: { ...state.systemStatus, ...status }
    })),

  // Computed properties
  getLightById: (id) => 
    get().trafficLights.find(light => light.id === id),

  getActiveLights: () => 
    get().trafficLights.filter(light => light.isActive),

  getTotalVehicles: () => 
    get().trafficLights.reduce((sum, light) => 
      sum + light.roads?.reduce((roadSum, road) => roadSum + road.vehicleCount, 0) || 0, 0
    ),

  getAverageCongestion: () => {
    const state = get();
    const totalCongestion = state.trafficLights.reduce((sum, light) => 
      sum + light.roads?.reduce((roadSum, road) => roadSum + road.congestionLevel, 0) || 0, 0
    );
    const totalRoads = state.trafficLights.reduce((sum, light) => sum + (light.roads?.length || 1), 0);
    return totalRoads > 0 ? totalCongestion / totalRoads : 0;
  }
}));