// Mock data generation using CMAPSS dataset integration
import { 
  cmapssEngines, 
  generateCMAPSSSensorData, 
  generateCMAPSSHealthData,
  getCMAPSSPerformanceMetrics,
  generateHistoricalData as generateCMAPSSHistoricalData,
  type CMAPSSEngine,
  type CMAPSSSensorReading,
  type CMAPSSHealthData
} from './cmapssData';

// Export interfaces for compatibility
export interface Engine {
  engineId: string;
  model: string;
  serialNumber: string;
  flightHours: number;
  cycles: number;
  healthScore: number;
  operationalState: 'operational' | 'maintenance' | 'offline';
  lastMaintenance: Date;
  nextMaintenance: Date;
}

export interface EngineStatus extends Engine {
  status: 'operational' | 'maintenance_required' | 'grounded';
}

export interface SensorReading {
  id: string;
  engineId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
}

export interface ComponentHealth {
  id: string;
  name: string;
  health: number;
  status: 'normal' | 'warning' | 'critical';
  lastInspection: Date;
  nextInspection: Date;
}

export interface PerformanceData {
  engineId: string;
  fuelEfficiency: number;
  thermalEfficiency: number;
  thrustOutput: number;
  operatingTemperature: number;
  vibrationLevel: number;
  pressureRatio: number;
  fanSpeed: number;
  coreSpeed: number;
}

export interface HistoricalDataPoint {
  date: string;
  healthScore: number;
  fuelEfficiency: number;
  temperature: number;
  vibration: number;
  thrustOutput: number;
  cycles: number;
}

export interface ComparisonData {
  engineId: string;
  model: string;
  fuelEfficiency: number;
  healthScore: number;
  thrustOutput: number;
  operatingHours: number;
}

export interface MaintenanceAlert {
  id: string;
  engineId: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  predictedFailureDate: Date;
  confidence: number;
  recommendation: string;
  estimatedCost: number;
}

export interface ChartDataPoint {
  time: string;
  EGT: number;
  N1_Speed: number;
  Fuel_Flow: number;
  Vibration: number;
}

// Convert CMAPSS engines to mock engine format
function convertCMAPSSToEngine(cmapssEngine: CMAPSSEngine): EngineStatus {
  return {
    engineId: cmapssEngine.engineId,
    model: cmapssEngine.model,
    serialNumber: cmapssEngine.serialNumber,
    flightHours: cmapssEngine.flightHours,
    cycles: cmapssEngine.cycles,
    healthScore: cmapssEngine.healthScore,
    operationalState: cmapssEngine.status === 'operational' ? 'operational' : 
                     cmapssEngine.status === 'maintenance_required' ? 'maintenance' : 'offline',
    status: cmapssEngine.status,
    lastMaintenance: new Date(cmapssEngine.lastMaintenance),
    nextMaintenance: new Date(cmapssEngine.nextMaintenance)
  };
}

// Export mock engines from CMAPSS data
export const mockEngines: EngineStatus[] = cmapssEngines.map(convertCMAPSSToEngine);

// Generate sensor data using CMAPSS
export function generateSensorData(engineId: string): SensorReading[] {
  const cmapssData = generateCMAPSSSensorData(engineId, 1);
  if (!cmapssData.length) return [];
  
  const reading = cmapssData[0];
  
  return [
    {
      id: `${engineId}-egt-${Date.now()}`,
      engineId,
      sensorType: 'EGT',
      value: reading.EGT,
      unit: '°C',
      timestamp: new Date(reading.timestamp),
      status: reading.EGT > 700 ? 'critical' : reading.EGT > 650 ? 'warning' : 'normal'
    },
    {
      id: `${engineId}-n1-${Date.now()}`,
      engineId,
      sensorType: 'N1_Speed',
      value: reading.N1,
      unit: '%',
      timestamp: new Date(reading.timestamp),
      status: reading.N1 > 105 ? 'critical' : reading.N1 > 100 ? 'warning' : 'normal'
    },
    {
      id: `${engineId}-n2-${Date.now()}`,
      engineId,
      sensorType: 'N2_Speed',
      value: reading.N2,
      unit: '%',
      timestamp: new Date(reading.timestamp),
      status: reading.N2 > 110 ? 'critical' : reading.N2 > 105 ? 'warning' : 'normal'
    },
    {
      id: `${engineId}-fuel-${Date.now()}`,
      engineId,
      sensorType: 'Fuel_Flow',
      value: reading.fuelFlow,
      unit: 'kg/hr',
      timestamp: new Date(reading.timestamp),
      status: reading.fuelFlow > 4000 ? 'critical' : reading.fuelFlow > 3500 ? 'warning' : 'normal'
    },
    {
      id: `${engineId}-vibration-${Date.now()}`,
      engineId,
      sensorType: 'Vibration',
      value: reading.vibration,
      unit: 'mm/s',
      timestamp: new Date(reading.timestamp),
      status: reading.vibration > 6 ? 'critical' : reading.vibration > 4 ? 'warning' : 'normal'
    }
  ];
}

// Generate maintenance alerts
export function generateMaintenanceAlerts(): MaintenanceAlert[] {
  const alerts: MaintenanceAlert[] = [];
  
  mockEngines.forEach(engine => {
    const healthData = generateCMAPSSHealthData(engine.engineId);
    
    if (healthData.healthScore < 75) {
      alerts.push({
        id: `alert-${engine.engineId}-${Date.now()}`,
        engineId: engine.engineId,
        component: 'Overall Engine Health',
        severity: healthData.healthScore < 60 ? 'critical' : 'high',
        predictedFailureDate: new Date(Date.now() + healthData.remainingUsefulLife * 24 * 60 * 60 * 1000),
        confidence: 0.85,
        recommendation: healthData.maintenanceRecommendation,
        estimatedCost: Math.round(15000 + Math.random() * 10000)
      });
    }
    
    healthData.criticalComponents.forEach(component => {
      alerts.push({
        id: `alert-${engine.engineId}-${component}-${Date.now()}`,
        engineId: engine.engineId,
        component,
        severity: 'medium',
        predictedFailureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        confidence: 0.75,
        recommendation: `Inspect ${component} during next maintenance window`,
        estimatedCost: Math.round(5000 + Math.random() * 8000)
      });
    });
  });
  
  return alerts;
}

// Generate performance metrics
export function generatePerformanceMetrics(engineId: string): PerformanceData | null {
  return getCMAPSSPerformanceMetrics(engineId);
}

// Generate historical data
export function generateHistoricalData(engineId: string, days: number): HistoricalDataPoint[] {
  return generateCMAPSSHistoricalData(engineId, days);
}

// Get component health data
export function getComponentHealthData(engineId: string): ComponentHealth[] {
  const healthData = generateCMAPSSHealthData(engineId);
  
  return [
    {
      id: 'fan',
      name: 'Fan Assembly',
      health: healthData.faultProbability > 0.3 ? 
        Math.round(85 - healthData.faultProbability * 20) : 
        Math.round(90 + Math.random() * 8),
      status: 'normal' as const,
      lastInspection: new Date('2024-01-15'),
      nextInspection: new Date('2024-07-15')
    },
    {
      id: 'compressor',
      name: 'High Pressure Compressor',
      health: Math.round(healthData.healthScore - 5 + Math.random() * 10),
      status: healthData.criticalComponents.includes('High Pressure Compressor') ? 'warning' as const : 'normal' as const,
      lastInspection: new Date('2024-02-01'),
      nextInspection: new Date('2024-08-01')
    },
    {
      id: 'combustor',
      name: 'Combustor',
      health: Math.round(healthData.healthScore + Math.random() * 5),
      status: 'normal' as const,
      lastInspection: new Date('2024-01-20'),
      nextInspection: new Date('2024-07-20')
    },
    {
      id: 'turbine',
      name: 'Turbine Assembly',
      health: Math.round(healthData.healthScore - 3 + Math.random() * 6),
      status: healthData.healthScore < 75 ? 'warning' as const : 'normal' as const,
      lastInspection: new Date('2024-03-01'),
      nextInspection: new Date('2024-09-01')
    },
    {
      id: 'nozzle',
      name: 'Exhaust Nozzle',
      health: Math.round(92 + Math.random() * 6),
      status: 'normal' as const,
      lastInspection: new Date('2024-02-15'),
      nextInspection: new Date('2024-08-15')
    }
  ];
}