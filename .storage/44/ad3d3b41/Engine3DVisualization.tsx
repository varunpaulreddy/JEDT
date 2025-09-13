import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { generateCMAPSSSensorData, generateCMAPSSHealthData } from '@/lib/cmapssData';
import type { CMAPSSSensorReading, CMAPSSHealthData } from '@/lib/cmapssData';

interface Engine3DVisualizationProps {
  engineId: string;
}

interface EngineComponentProps {
  engineId: string;
  showHotspots: boolean;
  cutawayMode: boolean;
  animationSpeed: number;
}

// Error Boundary Component
class Engine3DErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Engine3D Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div className="text-center p-4">
            <h3 className="text-lg font-semibold text-red-600 mb-2">3D Engine Visualization Error</h3>
            <p className="text-sm text-gray-600 mb-4">
              Unable to load the 3D engine visualization. Please try refreshing the page.
            </p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Realistic Turbofan Engine Component with comprehensive error handling
function RealisticTurbofanEngine({ 
  engineId, 
  showHotspots, 
  cutawayMode, 
  animationSpeed 
}: EngineComponentProps) {
  const engineRef = useRef<THREE.Group>(null);
  const fanRef = useRef<THREE.Group>(null);
  const compressorRef = useRef<THREE.Group>(null);
  const turbineRef = useRef<THREE.Group>(null);
  
  const [sensorData, setSensorData] = useState<CMAPSSSensorReading | null>(null);
  const [healthData, setHealthData] = useState<CMAPSSHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load real CMAPSS data with error handling
  useEffect(() => {
    if (!engineId) {
      setError('No engine ID provided');
      setIsLoading(false);
      return;
    }

    const loadData = () => {
      try {
        const sensors = generateCMAPSSSensorData(engineId, 1);
        const health = generateCMAPSSHealthData(engineId);
        
        setSensorData(sensors && sensors.length > 0 ? sensors[0] : null);
        setHealthData(health || null);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading engine data:', err);
        setError('Failed to load engine data');
        setIsLoading(false);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [engineId]);

  // Memoized materials to prevent recreation
  const materials = useMemo(() => {
    try {
      return {
        titaniumMaterial: new THREE.MeshPhysicalMaterial({
          color: 0xc0c0c0,
          metalness: 0.9,
          roughness: 0.1,
          clearcoat: 0.3,
          clearcoatRoughness: 0.1,
          envMapIntensity: 1.2
        }),
        inconelMaterial: new THREE.MeshPhysicalMaterial({
          color: 0x8b7355,
          metalness: 0.8,
          roughness: 0.3,
          emissive: 0x331100,
          emissiveIntensity: 0.1,
          envMapIntensity: 0.8
        }),
        steelMaterial: new THREE.MeshPhysicalMaterial({
          color: 0xa0a0a0,
          metalness: 0.7,
          roughness: 0.2,
          envMapIntensity: 1.0
        }),
        carbonFiberMaterial: new THREE.MeshPhysicalMaterial({
          color: 0x1a1a1a,
          metalness: 0.1,
          roughness: 0.8,
          normalScale: new THREE.Vector2(0.5, 0.5)
        }),
        ceramicMaterial: new THREE.MeshPhysicalMaterial({
          color: 0xf0f0e8,
          metalness: 0.0,
          roughness: 0.9,
          transmission: 0.1,
          thickness: 0.5
        })
      };
    } catch (err) {
      console.error('Error creating materials:', err);
      return null;
    }
  }, []);

  // Create detailed fan assembly with error handling
  const createFanAssembly = useCallback(() => {
    if (!materials) return new THREE.Group();
    
    try {
      const fanGroup = new THREE.Group();
      fanGroup.name = 'FanAssembly';
      
      // Fan disk (hub)
      const diskGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.15, 32);
      const fanDisk = new THREE.Mesh(diskGeometry, materials.titaniumMaterial);
      fanDisk.name = 'FanDisk';
      fanGroup.add(fanDisk);

      // Fan blades (24 blades for CFM56)
      const bladeCount = 24;
      for (let i = 0; i < bladeCount; i++) {
        const angle = (i / bladeCount) * Math.PI * 2;
        
        // Simplified blade geometry to prevent shape errors
        const bladeGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.05);
        const blade = new THREE.Mesh(bladeGeometry, materials.titaniumMaterial);
        blade.name = `FanBlade_${i}`;
        
        // Position and rotate blade
        blade.position.set(
          Math.cos(angle) * 0.4,
          0,
          Math.sin(angle) * 0.4
        );
        blade.rotation.y = angle;
        blade.rotation.x = Math.PI / 2;
        blade.rotation.z = Math.PI / 12; // Blade twist
        
        fanGroup.add(blade);
      }

      // Spinner (nose cone)
      const spinnerGeometry = new THREE.ConeGeometry(0.25, 0.4, 16);
      const spinner = new THREE.Mesh(spinnerGeometry, materials.steelMaterial);
      spinner.name = 'Spinner';
      spinner.position.z = 0.2;
      fanGroup.add(spinner);

      return fanGroup;
    } catch (err) {
      console.error('Error creating fan assembly:', err);
      return new THREE.Group();
    }
  }, [materials]);

  // Create compressor section with error handling
  const createCompressorSection = useCallback(() => {
    if (!materials) return new THREE.Group();
    
    try {
      const compressorGroup = new THREE.Group();
      compressorGroup.name = 'CompressorSection';
      
      // Simplified compressor stages to prevent excessive geometry creation
      const stageCount = 7; // Reduced from 14 for performance
      for (let stage = 0; stage < stageCount; stage++) {
        const stageZ = -0.5 - (stage * 0.2);
        const stageRadius = 0.35 - (stage * 0.03);
        
        // Rotor blades (simplified)
        const rotorCount = Math.max(8, 16 - stage); // Reduced blade count
        for (let i = 0; i < rotorCount; i++) {
          const angle = (i / rotorCount) * Math.PI * 2;
          
          const bladeGeometry = new THREE.BoxGeometry(0.08, 0.15 - stage * 0.008, 0.02);
          const blade = new THREE.Mesh(bladeGeometry, materials.titaniumMaterial);
          blade.name = `CompressorBlade_${stage}_${i}`;
          
          blade.position.set(
            Math.cos(angle) * stageRadius,
            0,
            stageZ
          );
          blade.rotation.y = angle + Math.PI / 2;
          
          compressorGroup.add(blade);
        }
      }

      // Compressor casing
      const casingGeometry = new THREE.CylinderGeometry(0.45, 0.4, 1.5, 16, 1, true);
      const casing = new THREE.Mesh(casingGeometry, materials.steelMaterial);
      casing.name = 'CompressorCasing';
      casing.position.z = -0.75;
      compressorGroup.add(casing);

      return compressorGroup;
    } catch (err) {
      console.error('Error creating compressor section:', err);
      return new THREE.Group();
    }
  }, [materials]);

  // Create combustor section with error handling
  const createCombustorSection = useCallback(() => {
    if (!materials) return new THREE.Group();
    
    try {
      const combustorGroup = new THREE.Group();
      combustorGroup.name = 'CombustorSection';
      
      // Combustor liner
      const linerGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16);
      const linerMaterial = materials.inconelMaterial.clone();
      const liner = new THREE.Mesh(linerGeometry, linerMaterial);
      liner.name = 'CombustorLiner';
      liner.position.z = -2.0;
      
      // Add thermal glow effect based on real temperature data
      if (sensorData && sensorData.EGT > 600) {
        const glowIntensity = Math.min(1.0, (sensorData.EGT - 600) / 400);
        if (linerMaterial instanceof THREE.MeshPhysicalMaterial) {
          linerMaterial.emissive.setRGB(glowIntensity * 0.8, glowIntensity * 0.3, 0);
          linerMaterial.emissiveIntensity = glowIntensity * 0.5;
        }
      }
      
      combustorGroup.add(liner);

      // Fuel nozzles (reduced count for performance)
      const nozzleCount = 12; // Reduced from 20
      for (let i = 0; i < nozzleCount; i++) {
        const angle = (i / nozzleCount) * Math.PI * 2;
        const nozzleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8);
        const nozzle = new THREE.Mesh(nozzleGeometry, materials.inconelMaterial);
        nozzle.name = `FuelNozzle_${i}`;
        
        nozzle.position.set(
          Math.cos(angle) * 0.3,
          0,
          -1.7
        );
        nozzle.rotation.x = Math.PI / 2;
        
        combustorGroup.add(nozzle);
      }

      // Combustor casing
      const casingGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16);
      const casing = new THREE.Mesh(casingGeometry, materials.ceramicMaterial);
      casing.name = 'CombustorCasing';
      casing.position.z = -2.0;
      combustorGroup.add(casing);

      return combustorGroup;
    } catch (err) {
      console.error('Error creating combustor section:', err);
      return new THREE.Group();
    }
  }, [materials, sensorData]);

  // Create turbine section with error handling
  const createTurbineSection = useCallback(() => {
    if (!materials) return new THREE.Group();
    
    try {
      const turbineGroup = new THREE.Group();
      turbineGroup.name = 'TurbineSection';
      
      // Simplified turbine stages
      const stageCount = 3; // Reduced from 6 for performance
      for (let stage = 0; stage < stageCount; stage++) {
        const stageZ = -2.8 - (stage * 0.4);
        const stageRadius = 0.28 + (stage * 0.02);
        
        const bladeCount = Math.max(12, 24 - stage * 4); // Reduced blade count
        for (let i = 0; i < bladeCount; i++) {
          const angle = (i / bladeCount) * Math.PI * 2;
          
          const bladeGeometry = new THREE.BoxGeometry(0.12, 0.18 + stage * 0.02, 0.025);
          const bladeMaterial = stage < 2 ? materials.inconelMaterial.clone() : materials.titaniumMaterial;
          const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
          blade.name = `TurbineBlade_${stage}_${i}`;
          
          blade.position.set(
            Math.cos(angle) * stageRadius,
            0,
            stageZ
          );
          blade.rotation.y = angle + Math.PI / 3;
          
          // Add thermal coating effect for hot section
          if (sensorData && sensorData.T30 > 1300 && stage < 2) {
            if (bladeMaterial instanceof THREE.MeshPhysicalMaterial) {
              bladeMaterial.emissive.setRGB(0.3, 0.1, 0);
              bladeMaterial.emissiveIntensity = 0.2;
            }
          }
          
          turbineGroup.add(blade);
        }
      }

      return turbineGroup;
    } catch (err) {
      console.error('Error creating turbine section:', err);
      return new THREE.Group();
    }
  }, [materials, sensorData]);

  // Create exhaust nozzle with error handling
  const createExhaustNozzle = useCallback(() => {
    if (!materials) return new THREE.Group();
    
    try {
      const nozzleGroup = new THREE.Group();
      nozzleGroup.name = 'ExhaustNozzle';
      
      // Variable geometry nozzle
      const nozzleGeometry = new THREE.ConeGeometry(0.4, 1.2, 16, 1, true);
      const nozzle = new THREE.Mesh(nozzleGeometry, materials.inconelMaterial);
      nozzle.name = 'Nozzle';
      nozzle.position.z = -5.5;
      nozzleGroup.add(nozzle);

      // Exhaust mixer
      const mixerGeometry = new THREE.CylinderGeometry(0.38, 0.42, 0.4, 16);
      const mixer = new THREE.Mesh(mixerGeometry, materials.titaniumMaterial);
      mixer.name = 'ExhaustMixer';
      mixer.position.z = -4.8;
      nozzleGroup.add(mixer);

      return nozzleGroup;
    } catch (err) {
      console.error('Error creating exhaust nozzle:', err);
      return new THREE.Group();
    }
  }, [materials]);

  // Create nacelle with error handling
  const createNacelle = useCallback(() => {
    if (!materials) return new THREE.Group();
    
    try {
      const nacelleGroup = new THREE.Group();
      nacelleGroup.name = 'Nacelle';
      
      // Inlet
      const inletGeometry = new THREE.CylinderGeometry(0.65, 0.55, 1.0, 16);
      const inlet = new THREE.Mesh(inletGeometry, materials.carbonFiberMaterial);
      inlet.name = 'Inlet';
      inlet.position.z = 1.0;
      nacelleGroup.add(inlet);

      // Fan cowl
      const cowlGeometry = new THREE.CylinderGeometry(0.55, 0.5, 2.0, 16, 1, true);
      const cowl = new THREE.Mesh(cowlGeometry, materials.carbonFiberMaterial);
      cowl.name = 'FanCowl';
      cowl.position.z = 0;
      nacelleGroup.add(cowl);

      return nacelleGroup;
    } catch (err) {
      console.error('Error creating nacelle:', err);
      return new THREE.Group();
    }
  }, [materials]);

  // Memoized engine components
  const engineComponents = useMemo(() => {
    if (!materials) return null;
    
    try {
      return {
        fan: createFanAssembly(),
        compressor: createCompressorSection(),
        combustor: createCombustorSection(),
        turbine: createTurbineSection(),
        nozzle: createExhaustNozzle(),
        nacelle: createNacelle()
      };
    } catch (err) {
      console.error('Error creating engine components:', err);
      return null;
    }
  }, [materials, createFanAssembly, createCompressorSection, createCombustorSection, createTurbineSection, createExhaustNozzle, createNacelle]);

  // Animation loop with null checks
  useFrame((state, delta) => {
    try {
      if (fanRef.current && sensorData && sensorData.N1) {
        const fanSpeed = (sensorData.N1 / 100) * animationSpeed * 0.5;
        fanRef.current.rotation.z += fanSpeed * delta;
      }

      if (compressorRef.current && sensorData && sensorData.N2) {
        const compressorSpeed = (sensorData.N2 / 100) * animationSpeed * 0.8;
        compressorRef.current.rotation.z += compressorSpeed * delta;
      }

      if (turbineRef.current && sensorData && sensorData.N2) {
        const turbineSpeed = (sensorData.N2 / 100) * animationSpeed * 1.2;
        turbineRef.current.rotation.z -= turbineSpeed * delta;
      }

      // Subtle engine vibration
      if (engineRef.current && sensorData && sensorData.vibration > 0) {
        const vibrationIntensity = Math.min(sensorData.vibration / 10, 0.01);
        engineRef.current.position.x = Math.sin(state.clock.elapsedTime * 30) * vibrationIntensity;
        engineRef.current.position.y = Math.cos(state.clock.elapsedTime * 25) * vibrationIntensity;
      }
    } catch (err) {
      console.error('Animation error:', err);
    }
  });

  // Handle loading and error states
  if (isLoading) {
    return (
      <group>
        <Html center>
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="text-center">Loading engine data...</div>
          </div>
        </Html>
      </group>
    );
  }

  if (error || !engineComponents) {
    return (
      <group>
        <Html center>
          <div className="bg-red-100 p-4 rounded-lg shadow-lg">
            <div className="text-center text-red-600">
              {error || 'Failed to create engine components'}
            </div>
          </div>
        </Html>
      </group>
    );
  }

  return (
    <group ref={engineRef} position={[0, 0, 0]}>
      {/* Nacelle (external) */}
      {!cutawayMode && engineComponents.nacelle && (
        <primitive object={engineComponents.nacelle} />
      )}
      
      {/* Fan assembly */}
      {engineComponents.fan && (
        <group ref={fanRef}>
          <primitive object={engineComponents.fan} />
        </group>
      )}
      
      {/* Compressor section */}
      {engineComponents.compressor && (
        <group ref={compressorRef}>
          <primitive object={engineComponents.compressor} />
        </group>
      )}
      
      {/* Combustor section */}
      {engineComponents.combustor && (
        <primitive object={engineComponents.combustor} />
      )}
      
      {/* Turbine section */}
      {engineComponents.turbine && (
        <group ref={turbineRef}>
          <primitive object={engineComponents.turbine} />
        </group>
      )}
      
      {/* Exhaust nozzle */}
      {engineComponents.nozzle && (
        <primitive object={engineComponents.nozzle} />
      )}

      {/* Health status indicators */}
      {showHotspots && healthData && (
        <>
          <Html position={[0, 0.8, 0]} center>
            <div className="bg-black/80 text-white p-2 rounded text-xs">
              Fan: {healthData.healthScore > 85 ? '✅' : healthData.healthScore > 70 ? '⚠️' : '🔴'} {healthData.healthScore.toFixed(1)}%
            </div>
          </Html>
          
          <Html position={[0, 0.8, -1.5]} center>
            <div className="bg-black/80 text-white p-2 rounded text-xs">
              HPC: {healthData.criticalComponents?.includes('High Pressure Compressor') ? '⚠️' : '✅'} 
              {(healthData.healthScore - 5).toFixed(1)}%
            </div>
          </Html>
          
          <Html position={[0, 0.8, -2.5]} center>
            <div className="bg-black/80 text-white p-2 rounded text-xs">
              EGT: {sensorData ? `${sensorData.EGT.toFixed(0)}°C` : 'N/A'}
              {sensorData && sensorData.EGT > 700 ? ' 🔥' : ''}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

// Main component with comprehensive error handling
export default function Engine3DVisualization({ engineId }: Engine3DVisualizationProps) {
  const [showHotspots, setShowHotspots] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState([1.0]);
  const [viewMode, setViewMode] = useState<'external' | 'cutaway' | 'xray'>('external');
  const [sensorData, setSensorData] = useState<CMAPSSSensorReading | null>(null);
  const [healthData, setHealthData] = useState<CMAPSSHealthData | null>(null);

  // Validate engineId
  const validEngineId = engineId || 'CMAPSS-FD001-001';

  useEffect(() => {
    const loadData = () => {
      try {
        const sensors = generateCMAPSSSensorData(validEngineId, 1);
        const health = generateCMAPSSHealthData(validEngineId);
        setSensorData(sensors && sensors.length > 0 ? sensors[0] : null);
        setHealthData(health || null);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [validEngineId]);

  return (
    <Engine3DErrorBoundary>
      <Card className="w-full h-[800px]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                🚁 Realistic Turbofan Engine - {validEngineId}
                <Badge variant="outline">NASA CMAPSS Data</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                CFM56-7B Digital Twin with Real-time Sensor Integration
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'external' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('external')}
              >
                External
              </Button>
              <Button
                variant={viewMode === 'cutaway' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cutaway')}
              >
                Cutaway
              </Button>
              <Button
                variant={viewMode === 'xray' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('xray')}
              >
                X-Ray
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 h-[600px] relative">
          {/* 3D Canvas with error boundary */}
          <Canvas
            camera={{ position: [5, 2, 5], fov: 50 }}
            shadows
            className="w-full h-full"
            onError={(error) => console.error('Canvas error:', error)}
          >
            <Environment preset="studio" />
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1.5}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            <pointLight position={[0, 0, -5]} intensity={0.8} color="#ff6600" />
            
            <RealisticTurbofanEngine
              engineId={validEngineId}
              showHotspots={showHotspots}
              cutawayMode={viewMode === 'cutaway' || viewMode === 'xray'}
              animationSpeed={animationSpeed[0] || 1.0}
            />
            
            <ContactShadows
              opacity={0.4}
              scale={10}
              blur={1}
              far={10}
              resolution={256}
              color="#000000"
            />
            
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={3}
              maxDistance={15}
            />
          </Canvas>

          {/* Real-time data overlay */}
          <div className="absolute top-4 left-4 bg-black/80 text-white p-3 rounded-lg text-sm space-y-1">
            <div className="font-semibold">Real-time CMAPSS Data</div>
            {sensorData ? (
              <>
                <div>N1: {sensorData.N1?.toFixed(1) || 'N/A'}% | N2: {sensorData.N2?.toFixed(1) || 'N/A'}%</div>
                <div>EGT: {sensorData.EGT?.toFixed(0) || 'N/A'}°C | Fuel: {sensorData.fuelFlow?.toFixed(0) || 'N/A'} kg/hr</div>
                <div>EPR: {sensorData.epr?.toFixed(2) || 'N/A'} | Vibration: {sensorData.vibration?.toFixed(2) || 'N/A'} mm/s</div>
              </>
            ) : (
              <div>Loading sensor data...</div>
            )}
            {healthData && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div>Health Score: {healthData.healthScore?.toFixed(1) || 'N/A'}%</div>
                <div>RUL: {healthData.remainingUsefulLife || 'N/A'} cycles</div>
              </div>
            )}
          </div>

          {/* Controls overlay */}
          <div className="absolute top-4 right-4 bg-white/90 p-4 rounded-lg space-y-3 min-w-[200px]">
            <div className="flex items-center justify-between">
              <Label htmlFor="hotspots">Health Indicators</Label>
              <Switch
                id="hotspots"
                checked={showHotspots}
                onCheckedChange={setShowHotspots}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Animation Speed</Label>
              <Slider
                value={animationSpeed}
                onValueChange={setAnimationSpeed}
                max={3}
                min={0}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {(animationSpeed[0] || 1.0).toFixed(1)}x
              </div>
            </div>
          </div>

          {/* Status indicators */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <Badge variant="outline" className="bg-green-100">
              ✅ Real NASA Data
            </Badge>
            <Badge variant="outline" className="bg-blue-100">
              🔄 Live Updates
            </Badge>
            <Badge variant="outline" className="bg-purple-100">
              🎯 CFM56-7B Model
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Engine3DErrorBoundary>
  );
}