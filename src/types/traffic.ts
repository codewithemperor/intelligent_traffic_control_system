export enum Status {
  RED = 'RED',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  FLASHING_RED = 'FLASHING_RED',
  FLASHING_YELLOW = 'FLASHING_YELLOW',
  MAINTENANCE = 'MAINTENANCE'
}

export enum Direction {
  NORTH = 'NORTH',
  SOUTH = 'SOUTH',
  EAST = 'EAST',
  WEST = 'WEST',
  NORTHEAST = 'NORTHEAST',
  NORTHWEST = 'NORTHWEST',
  SOUTHEAST = 'SOUTHEAST',
  SOUTHWEST = 'SOUTHWEST'
}

export enum VehicleType {
  CAR = 'CAR',
  BUS = 'BUS',
  MOTORCYCLE = 'MOTORCYCLE',
  TRUCK = 'TRUCK',
  EMERGENCY = 'EMERGENCY',
  BICYCLE = 'BICYCLE'
}

export enum SensorType {
  PRESSURE = 'PRESSURE',
  INFRARED = 'INFRARED',
  CAMERA = 'CAMERA',
  RADAR = 'RADAR',
  LOOP_DETECTOR = 'LOOP_DETECTOR'
}

export enum Algorithm {
  FIXED = 'FIXED',
  ADAPTIVE = 'ADAPTIVE',
  AI_OPTIMIZED = 'AI_OPTIMIZED',
  EMERGENCY = 'EMERGENCY'
}

export interface Intersection {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  priority: number;
  algorithm: Algorithm;
  createdAt: Date;
  updatedAt: Date;
  trafficLights?: TrafficLight[];
  roads?: Road[];
  sensors?: Sensor[];
  logs?: TrafficLog[];
}

export interface TrafficLight {
  id: string;
  intersectionId: string;
  roadId: string;
  direction: Direction;
  status: Status;
  timing: {
    red: number;
    yellow: number;
    green: number;
    cycle: number;
  };
  isActive: boolean;
  lastChanged: Date;
  totalCycles: number;
  currentCycleTime: number;
  createdAt: Date;
  updatedAt: Date;
  intersection?: Intersection;
  road?: Road;
  sensors?: Sensor[];
  logs?: TrafficLog[];
}

export interface Road {
  id: string;
  name: string;
  direction: Direction;
  vehicleCount: number;
  maxCapacity: number;
  intersectionId: string;
  isActive: boolean;
  congestionLevel: number;
  averageSpeed: number;
  createdAt: Date;
  updatedAt: Date;
  intersection?: Intersection;
  vehicles?: Vehicle[];
  trafficLights?: TrafficLight[];
  sensors?: Sensor[];
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: VehicleType;
  roadId: string;
  speed: number;
  position: number;
  isMoving: boolean;
  priority: number;
  enteredAt: Date;
  exitedAt?: Date;
  road?: Road;
}

export interface Sensor {
  id: string;
  name: string;
  type: SensorType;
  roadId?: string;
  trafficLightId?: string;
  intersectionId?: string;
  isActive: boolean;
  sensitivity: number;
  lastReading: number;
  createdAt: Date;
  road?: Road;
  trafficLight?: TrafficLight;
  intersection?: Intersection;
  readings?: SensorReading[];
}

export interface SensorReading {
  id: string;
  sensorId: string;
  value: number;
  vehicleCount: number;
  avgSpeed: number;
  timestamp: Date;
  sensor?: Sensor;
}

export interface TrafficLog {
  id: string;
  intersectionId: string;
  trafficLightId: string;
  action: string;
  previousState: Status;
  newState: Status;
  reason: string;
  vehicleCount: number;
  efficiency?: number;
  waitTime?: number;
  timestamp: Date;
  intersection?: Intersection;
  trafficLight?: TrafficLight;
}

export interface TrafficLightProps {
  id: string;
  name: string;
  status: Status;
  timing: {
    red: number;
    yellow: number;
    green: number;
    cycle: number;
  };
  vehicleCount: number;
  isManual?: boolean;
  onManualOverride?: (id: string, status: Status) => void;
}

export interface RoadStatus {
  roadName: string;
  direction: Direction;
  vehicleCount: number;
  maxCapacity: number;
  congestionLevel: number;
  avgSpeed: number;
}

export interface WebSocketEvents {
  'traffic-light-change': {
    lightId: string;
    oldStatus: Status;
    newStatus: Status;
    timestamp: Date;
  };
  
  'vehicle-count-update': {
    roadId: string;
    count: number;
    congestionLevel: number;
  };
  
  'system-alert': {
    type: 'info' | 'warning' | 'error';
    message: string;
    lightId?: string;
  };
  
  'performance-update': {
    totalVehicles: number;
    avgWaitTime: number;
    efficiency: number;
  };
}

export interface CampusIntersection {
  name: string;
  roads: string[];
}

export interface TrafficPattern {
  time: string;
  multiplier: number;
}

export interface VehicleGenerationRules {
  averageInterval: number;
  randomness: number;
  emergencyProbability: number;
  peakHourBoost: number;
}