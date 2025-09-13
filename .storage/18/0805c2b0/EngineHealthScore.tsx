import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { EngineStatus } from '@/lib/mockData';

interface EngineHealthScoreProps {
  engine: EngineStatus;
}

export default function EngineHealthScore({ engine }: EngineHealthScoreProps) {
  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    if (score >= 70) return 'outline';
    return 'destructive';
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'maintenance':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'operational':
        return 'text-green-600';
      case 'maintenance':
        return 'text-yellow-600';
      case 'offline':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const daysUntilMaintenance = Math.ceil(
    (engine.nextMaintenance.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {engine.model}
          </CardTitle>
          <Badge variant={getHealthBadgeVariant(engine.healthScore)}>
            Health: {engine.healthScore}%
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {getStatusIcon(engine.operationalState)}
          <span className={getStatusColor(engine.operationalState)}>
            {engine.operationalState.charAt(0).toUpperCase() + engine.operationalState.slice(1)}
          </span>
          <span className="ml-2">S/N: {engine.serialNumber}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Health Score Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Health Score</span>
            <span className={getHealthColor(engine.healthScore)}>
              {engine.healthScore}%
            </span>
          </div>
          <Progress 
            value={engine.healthScore} 
            className="h-2"
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Flight Hours</div>
            <div className="font-semibold">{engine.flightHours.toLocaleString()}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Next Maintenance</div>
            <div className={`font-semibold ${daysUntilMaintenance < 30 ? 'text-orange-600' : 'text-green-600'}`}>
              {daysUntilMaintenance} days
            </div>
          </div>
        </div>

        {/* Maintenance Timeline */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Maintenance Timeline</div>
          <div className="flex justify-between text-xs">
            <div>
              <div className="text-muted-foreground">Last</div>
              <div>{engine.lastMaintenance.toLocaleDateString()}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Current</div>
              <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto"></div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">Next</div>
              <div>{engine.nextMaintenance.toLocaleDateString()}</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute top-1 left-0 right-0 h-0.5 bg-gray-200"></div>
            <div 
              className="absolute top-1 left-0 h-0.5 bg-blue-500"
              style={{ 
                width: `${Math.min(100, Math.max(0, 
                  ((new Date().getTime() - engine.lastMaintenance.getTime()) / 
                   (engine.nextMaintenance.getTime() - engine.lastMaintenance.getTime())) * 100
                ))}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-green-600 font-semibold">Low Risk</div>
            <div className="text-muted-foreground">Components: 6</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="text-yellow-600 font-semibold">Medium Risk</div>
            <div className="text-muted-foreground">Components: 2</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-red-600 font-semibold">High Risk</div>
            <div className="text-muted-foreground">Components: 0</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}