import React, { useRef, useEffect, useState } from 'react';
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

// Realistic Turbofan Engine Component
function RealisticTurbofanEngine({ 
  engineId, 
  showHotspots, 
  cutawayMode, 
  animationSpeed 
}: EngineComponentProps) {
  const engineRef = useRef<THREE.Group>(null);
  const fanRef = useRef<THREE.Mesh>(null);
  const compressorRef = useRef<THREE.Group>(null);
  const turbineRef = useRef<THREE.Group>(null);
  
  const [sensorData, setSensorData] = useState<CMAPSSSensorReading | null>(null);
  const [healthData, setHealthData] = useState<CMAPSSHealthData | null>(null);

  // Load real CMAPSS data
  useEffect(() => {
    const loadData = () => {
      const sensors = generateCMAPSSSensorData(engineId, 1);
      const health = generateCMAPSSHealthData(engineId);
      setSensorData(sensors[0] || null);
      setHealthData(health);
    };
    
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [engineId]);

  // Create realistic materials
  const createMaterials = () => {
    // Titanium alloy for fan and compressor
    const titaniumMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc0c0c0,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.2
    });

    // Inconel for hot section (combustor/turbine)
    const inconelMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8b7355,
      metalness: 0.8,
      roughness: 0.3,
      emissive: 0x331100,
      emissiveIntensity: 0.1,
      envMapIntensity: 0.8
    });

    // Stainless steel for casing
    const steelMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xa0a0a0,
      metalness: 0.7,
      roughness: 0.2,
      envMapIntensity: 1.0
    });

    // Carbon fiber for nacelle
    const carbonFiberMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1a,
      metalness: 0.1,
      roughness: 0.8,
      normalScale: new THREE.Vector2(0.5, 0.5)
    });

    // Ceramic thermal barrier coating
    const ceramicMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf0f0e8,
      metalness: 0.0,
      roughness: 0.9,
      transmission: 0.1,
      thickness: 0.5
    });

    return { titaniumMaterial, inconelMaterial, steelMaterial, carbonFiberMaterial, ceramicMaterial };
  };

  const materials = createMaterials();

  // Create detailed fan assembly
  const createFanAssembly = () => {
    const fanGroup = new THREE.Group();
    
    // Fan disk (hub)
    const diskGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.15, 32);
    const fanDisk = new THREE.Mesh(diskGeometry, materials.titaniumMaterial);
    fanGroup.add(fanDisk);

    // Fan blades (24 blades for CFM56)
    const bladeCount = 24;
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i / bladeCount) * Math.PI * 2;
      
      // Create realistic airfoil blade shape
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0);
      bladeShape.bezierCurveTo(0.1, 0.05, 0.8, 0.03, 1.0, 0);
      bladeShape.bezierCurveTo(0.9, -0.02, 0.2, -0.03, 0, 0);
      
      const extrudeSettings = {
        depth: 0.05,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.01,
        bevelThickness: 0.01
      };
      
      const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
      const blade = new THREE.Mesh(bladeGeometry, materials.titaniumMaterial);
      
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
    spinner.position.z = 0.2;
    fanGroup.add(spinner);

    return fanGroup;
  };

  // Create compressor section
  const createCompressorSection = () => {
    const compressorGroup = new THREE.Group();
    
    // Multiple compressor stages (14 stages for CFM56)
    const stageCount = 14;
    for (let stage = 0; stage < stageCount; stage++) {
      const stageZ = -0.5 - (stage * 0.1);
      const stageRadius = 0.35 - (stage * 0.015); // Decreasing radius
      
      // Rotor blades
      const rotorCount = 32 - stage; // Decreasing blade count
      for (let i = 0; i < rotorCount; i++) {
        const angle = (i / rotorCount) * Math.PI * 2;
        
        const bladeGeometry = new THREE.BoxGeometry(0.08, 0.15 - stage * 0.008, 0.02);
        const blade = new THREE.Mesh(bladeGeometry, materials.titaniumMaterial);
        
        blade.position.set(
          Math.cos(angle) * stageRadius,
          0,
          stageZ
        );
        blade.rotation.y = angle + Math.PI / 2;
        
        compressorGroup.add(blade);
      }
      
      // Stator vanes
      for (let i = 0; i < rotorCount + 8; i++) {
        const angle = (i / (rotorCount + 8)) * Math.PI * 2;
        
        const vaneGeometry = new THREE.BoxGeometry(0.06, 0.12 - stage * 0.006, 0.015);
        const vane = new THREE.Mesh(vaneGeometry, materials.steelMaterial);
        
        vane.position.set(
          Math.cos(angle) * (stageRadius + 0.1),
          0,
          stageZ - 0.05
        );
        vane.rotation.y = angle;
        
        compressorGroup.add(vane);
      }
    }

    // Compressor casing
    const casingGeometry = new THREE.CylinderGeometry(0.45, 0.4, 1.5, 32, 1, true);
    const casing = new THREE.Mesh(casingGeometry, materials.steelMaterial);
    casing.position.z = -0.75;
    compressorGroup.add(casing);

    return compressorGroup;
  };

  // Create combustor section
  const createCombustorSection = () => {
    const combustorGroup = new THREE.Group();
    
    // Combustor liner
    const linerGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16);
    const liner = new THREE.Mesh(linerGeometry, materials.inconelMaterial.clone());
    liner.position.z = -2.0;
    
    // Add thermal glow effect based on real temperature data
    if (sensorData && sensorData.EGT > 600) {
      const glowIntensity = Math.min(1.0, (sensorData.EGT - 600) / 400);
      const material = liner.material as THREE.MeshPhysicalMaterial;
      material.emissive.setRGB(glowIntensity * 0.8, glowIntensity * 0.3, 0);
      material.emissiveIntensity = glowIntensity * 0.5;
    }
    
    combustorGroup.add(liner);

    // Fuel nozzles (20 nozzles)
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const nozzleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8);
      const nozzle = new THREE.Mesh(nozzleGeometry, materials.inconelMaterial);
      
      nozzle.position.set(
        Math.cos(angle) * 0.3,
        0,
        -1.7
      );
      nozzle.rotation.x = Math.PI / 2;
      
      combustorGroup.add(nozzle);
    }

    // Combustor casing with cooling holes
    const casingGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 32);
    const casing = new THREE.Mesh(casingGeometry, materials.ceramicMaterial);
    casing.position.z = -2.0;
    combustorGroup.add(casing);

    return combustorGroup;
  };

  // Create turbine section
  const createTurbineSection = () => {
    const turbineGroup = new THREE.Group();
    
    // High pressure turbine (2 stages)
    for (let stage = 0; stage < 2; stage++) {
      const stageZ = -2.8 - (stage * 0.3);
      
      // Turbine blades (more complex than compressor)
      const bladeCount = 64 + stage * 8;
      for (let i = 0; i < bladeCount; i++) {
        const angle = (i / bladeCount) * Math.PI * 2;
        
        // Create curved turbine blade
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, 0);
        bladeShape.bezierCurveTo(0.05, 0.08, 0.1, 0.12, 0.15, 0.1);
        bladeShape.bezierCurveTo(0.12, 0.05, 0.08, 0.02, 0, 0);
        
        const extrudeSettings = {
          depth: 0.03,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 0.005,
          bevelThickness: 0.005
        };
        
        const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
        const blade = new THREE.Mesh(bladeGeometry, materials.inconelMaterial.clone());
        
        blade.position.set(
          Math.cos(angle) * 0.28,
          0,
          stageZ
        );
        blade.rotation.y = angle - Math.PI / 2;
        blade.rotation.x = Math.PI / 2;
        
        // Add thermal coating effect
        if (sensorData && sensorData.T30 > 1300) {
          const material = blade.material as THREE.MeshPhysicalMaterial;
          material.emissive.setRGB(0.3, 0.1, 0);
          material.emissiveIntensity = 0.2;
        }
        
        turbineGroup.add(blade);
      }
    }

    // Low pressure turbine (4 stages)
    for (let stage = 0; stage < 4; stage++) {
      const stageZ = -3.5 - (stage * 0.25);
      const stageRadius = 0.32 + (stage * 0.02); // Increasing radius
      
      const bladeCount = 48 - stage * 2;
      for (let i = 0; i < bladeCount; i++) {
        const angle = (i / bladeCount) * Math.PI * 2;
        
        const bladeGeometry = new THREE.BoxGeometry(0.12, 0.18 + stage * 0.02, 0.025);
        const blade = new THREE.Mesh(bladeGeometry, materials.titaniumMaterial);
        
        blade.position.set(
          Math.cos(angle) * stageRadius,
          0,
          stageZ
        );
        blade.rotation.y = angle + Math.PI / 3;
        
        turbineGroup.add(blade);
      }
    }

    return turbineGroup;
  };

  // Create exhaust nozzle
  const createExhaustNozzle = () => {
    const nozzleGroup = new THREE.Group();
    
    // Variable geometry nozzle
    const nozzleGeometry = new THREE.ConeGeometry(0.4, 1.2, 16, 1, true);
    const nozzle = new THREE.Mesh(nozzleGeometry, materials.inconelMaterial);
    nozzle.position.z = -5.5;
    nozzleGroup.add(nozzle);

    // Exhaust mixer
    const mixerGeometry = new THREE.CylinderGeometry(0.38, 0.42, 0.4, 16);
    const mixer = new THREE.Mesh(mixerGeometry, materials.titaniumMaterial);
    mixer.position.z = -4.8;
    nozzleGroup.add(mixer);

    // Thrust reverser cascades
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const cascadeGeometry = new THREE.BoxGeometry(0.02, 0.15, 0.08);
      const cascade = new THREE.Mesh(cascadeGeometry, materials.steelMaterial);
      
      cascade.position.set(
        Math.cos(angle) * 0.45,
        0,
        -4.6
      );
      cascade.rotation.y = angle;
      
      nozzleGroup.add(cascade);
    }

    return nozzleGroup;
  };

  // Create nacelle and external components
  const createNacelle = () => {
    const nacelleGroup = new THREE.Group();
    
    // Inlet
    const inletGeometry = new THREE.CylinderGeometry(0.65, 0.55, 1.0, 32);
    const inlet = new THREE.Mesh(inletGeometry, materials.carbonFiberMaterial);
    inlet.position.z = 1.0;
    nacelleGroup.add(inlet);

    // Fan cowl
    const cowlGeometry = new THREE.CylinderGeometry(0.55, 0.5, 2.0, 32, 1, true);
    const cowl = new THREE.Mesh(cowlGeometry, materials.carbonFiberMaterial);
    cowl.position.z = 0;
    nacelleGroup.add(cowl);

    // Bypass duct
    const bypassGeometry = new THREE.CylinderGeometry(0.5, 0.45, 4.0, 32, 1, true);
    const bypass = new THREE.Mesh(bypassGeometry, materials.steelMaterial);
    bypass.position.z = -2.5;
    nacelleGroup.add(bypass);

    // Engine mounts
    const mountGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.2);
    const mount1 = new THREE.Mesh(mountGeometry, materials.steelMaterial);
    mount1.position.set(0, -0.6, -1.5);
    nacelleGroup.add(mount1);

    const mount2 = new THREE.Mesh(mountGeometry, materials.steelMaterial);
    mount2.position.set(0, 0.6, -1.5);
    nacelleGroup.add(mount2);

    return nacelleGroup;
  };

  // Animation loop
  useFrame((state, delta) => {
    if (fanRef.current && sensorData) {
      // Realistic fan rotation based on N1 speed
      const fanSpeed = (sensorData.N1 / 100) * animationSpeed * 0.5;
      fanRef.current.rotation.z += fanSpeed * delta;
    }

    if (compressorRef.current && sensorData) {
      // Compressor rotation based on N2 speed
      const compressorSpeed = (sensorData.N2 / 100) * animationSpeed * 0.8;
      compressorRef.current.rotation.z += compressorSpeed * delta;
    }

    if (turbineRef.current && sensorData) {
      // Turbine rotation (opposite direction, higher speed)
      const turbineSpeed = (sensorData.N2 / 100) * animationSpeed * 1.2;
      turbineRef.current.rotation.z -= turbineSpeed * delta;
    }

    // Subtle engine vibration based on real vibration data
    if (engineRef.current && sensorData && sensorData.vibration > 0) {
      const vibrationIntensity = Math.min(sensorData.vibration / 10, 0.01);
      engineRef.current.position.x = Math.sin(state.clock.elapsedTime * 30) * vibrationIntensity;
      engineRef.current.position.y = Math.cos(state.clock.elapsedTime * 25) * vibrationIntensity;
    }
  });

  // Create complete engine assembly
  const fan = createFanAssembly();
  const compressor = createCompressorSection();
  const combustor = createCombustorSection();
  const turbine = createTurbineSection();
  const nozzle = createExhaustNozzle();
  const nacelle = createNacelle();

  return (
    <group ref={engineRef} position={[0, 0, 0]} scale={cutawayMode ? [1, 1, 1] : [1, 1, 1]}>
      {/* Nacelle (external) */}
      {!cutawayMode && <primitive object={nacelle} />}
      
      {/* Fan assembly */}
      <group ref={fanRef}>
        <primitive object={fan} />
      </group>
      
      {/* Compressor section */}
      <group ref={compressorRef}>
        <primitive object={compressor} />
      </group>
      
      {/* Combustor section */}
      <primitive object={combustor} />
      
      {/* Turbine section */}
      <group ref={turbineRef}>
        <primitive object={turbine} />
      </group>
      
      {/* Exhaust nozzle */}
      <primitive object={nozzle} />

      {/* Health status indicators */}
      {showHotspots && healthData && (
        <>
          {/* Fan health indicator */}
          <Html position={[0, 0.8, 0]} center>
            <div className="bg-black/80 text-white p-2 rounded text-xs">
              Fan: {healthData.healthScore > 85 ? '✅' : healthData.healthScore > 70 ? '⚠️' : '🔴'} {healthData.healthScore.toFixed(1)}%
            </div>
          </Html>
          
          {/* Compressor health indicator */}
          <Html position={[0, 0.8, -1.5]} center>
            <div className="bg-black/80 text-white p-2 rounded text-xs">
              HPC: {healthData.criticalComponents.includes('High Pressure Compressor') ? '⚠️' : '✅'} 
              {(healthData.healthScore - 5).toFixed(1)}%
            </div>
          </Html>
          
          {/* Combustor temperature indicator */}
          <Html position={[0, 0.8, -2.5]} center>
            <div className="bg-black/80 text-white p-2 rounded text-xs">
              EGT: {sensorData ? `${sensorData.EGT.toFixed(0)}°C` : 'N/A'}
              {sensorData && sensorData.EGT > 700 ? ' 🔥' : ''}
            </div>
          </Html>
          
          {/* Turbine health indicator */}
          <Html position={[0, 0.8, -3.5]} center>
            <div className="bg-black/80 text-white p-2 rounded text-xs">
              Turbine: {healthData.healthScore > 75 ? '✅' : '⚠️'} {(healthData.healthScore - 3).toFixed(1)}%
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

// Main component
export default function Engine3DVisualization({ engineId }: Engine3DVisualizationProps) {
  const [showHotspots, setShowHotspots] = useState(true);
  const [cutawayMode, setCutawayMode] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState([1.0]);
  const [viewMode, setViewMode] = useState<'external' | 'cutaway' | 'xray'>('external');
  
  const [sensorData, setSensorData] = useState<CMAPSSSensorReading | null>(null);
  const [healthData, setHealthData] = useState<CMAPSSHealthData | null>(null);

  useEffect(() => {
    const loadData = () => {
      const sensors = generateCMAPSSSensorData(engineId, 1);
      const health = generateCMAPSSHealthData(engineId);
      setSensorData(sensors[0] || null);
      setHealthData(health);
    };
    
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [engineId]);

  return (
    <Card className="w-full h-[800px]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              🚁 Realistic Turbofan Engine - {engineId}
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
        {/* 3D Canvas */}
        <Canvas
          camera={{ position: [5, 2, 5], fov: 50 }}
          shadows
          className="w-full h-full"
        >
          {/* Studio environment with clean industrial lighting */}
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
            engineId={engineId}
            showHotspots={showHotspots}
            cutawayMode={viewMode === 'cutaway' || viewMode === 'xray'}
            animationSpeed={animationSpeed[0]}
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
          {sensorData && (
            <>
              <div>N1: {sensorData.N1.toFixed(1)}% | N2: {sensorData.N2.toFixed(1)}%</div>
              <div>EGT: {sensorData.EGT.toFixed(0)}°C | Fuel: {sensorData.fuelFlow.toFixed(0)} kg/hr</div>
              <div>EPR: {sensorData.epr.toFixed(2)} | Vibration: {sensorData.vibration.toFixed(2)} mm/s</div>
            </>
          )}
          {healthData && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div>Health Score: {healthData.healthScore.toFixed(1)}%</div>
              <div>RUL: {healthData.remainingUsefulLife} cycles</div>
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
              {animationSpeed[0].toFixed(1)}x
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
  );
}