import { Algorithm, CampusIntersection, TrafficPattern, VehicleGenerationRules, VehicleType } from '@/types/traffic';

export const FIXED_TIMING = {
  RED: 30,    // seconds
  YELLOW: 5,  // seconds
  GREEN: 25,  // seconds
  CYCLE: 60   // total cycle time
};

export const CAMPUS_TRAFFIC_PATTERNS: Record<string, TrafficPattern> = {
  PEAK_MORNING: { time: "08:00-09:30", multiplier: 3.0 },
  LUNCH_RUSH: { time: "12:00-13:00", multiplier: 2.5 },
  PEAK_EVENING: { time: "16:00-17:30", multiplier: 2.8 },
  NORMAL: { time: "default", multiplier: 1.0 },
  NIGHT: { time: "22:00-06:00", multiplier: 0.3 }
};

export const VEHICLE_GENERATION_RULES: VehicleGenerationRules = {
  averageInterval: 5, // seconds between vehicles
  randomness: 0.3, // 30% randomness
  emergencyProbability: 0.02, // 2% emergency vehicles
  peakHourBoost: 2.5 // 2.5x more vehicles during peak
};

export const CAMPUS_INTERSECTIONS: CampusIntersection[] = [
  { name: "Main Gate Junction", roads: ["Main Road N", "Main Road S", "Gate Road E", ] },
  { name: "Library Intersection", roads: ["Library Ave N", "Library Ave S", ] },
  // { name: "Hostel Junction", roads: ["Hostel Rd N", "Hostel Rd S", "Recreation Ave E", "Recreation Ave W"] },
  // { name: "Admin Block Junction", roads: ["Admin Ave N", "Admin Ave S", "Faculty Rd E", "Faculty Rd W"] },
  // { name: "Sports Complex Junction", roads: ["Sports Rd N", "Sports Rd S", "Stadium Ave E", "Stadium Ave W"] },
  // { name: "Cafeteria Intersection", roads: ["Cafeteria St N", "Cafeteria St S", "Dining Ave E", "Dining Ave W"] }
];

export const ALGORITHM_DESCRIPTIONS: Record<Algorithm, string> = {
  [Algorithm.FIXED]: "Fixed timing with consistent intervals",
  [Algorithm.ADAPTIVE]: "Adjusts timing based on vehicle count",
  [Algorithm.AI_OPTIMIZED]: "Machine learning optimization",
  [Algorithm.EMERGENCY]: "Emergency vehicle priority mode"
};

export const STATUS_COLORS: Record<string, string> = {
  RED: 'bg-red-500',
  YELLOW: 'bg-yellow-500',
  GREEN: 'bg-green-500',
  FLASHING_RED: 'bg-red-500 animate-pulse',
  FLASHING_YELLOW: 'bg-yellow-500 animate-pulse',
  MAINTENANCE: 'bg-gray-500'
};

export const CONGESTION_LEVELS = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 0.8
};

export const VEHICLE_TYPE_WEIGHTS = {
  [VehicleType.CAR]: 0.7,
  [VehicleType.BUS]: 0.1,
  [VehicleType.MOTORCYCLE]: 0.15,
  [VehicleType.TRUCK]: 0.03,
  [VehicleType.EMERGENCY]: 0.015,
  [VehicleType.BICYCLE]: 0.005
};