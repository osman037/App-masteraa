import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Square, FileText, Settings, Hammer, Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PhaseControlsProps {
  project: any;
  onPhaseStart: (phase: string) => void;
  onPhaseStop: () => void;
}

export function PhaseControls({ project, onPhaseStart, onPhaseStop }: PhaseControlsProps) {
  const [activePhase, setActivePhase] = useState<string | null>(null);

  const phases = [
    {
      id: 'analyze',
      name: 'Analysis',
      icon: <FileText className="w-4 h-4" />,
      description: 'Deep project analysis and framework detection',
      enabled: project?.status === 'extracted' || project?.status === 'uploaded',
      endpoint: `/api/projects/${project?.id}/analyze`
    },
    {
      id: 'setup',
      name: 'Setup',
      icon: <Settings className="w-4 h-4" />,
      description: 'Dependencies, SDKs, and missing files setup',
      enabled: project?.status === 'analyzed' || project?.analysis,
      endpoint: `/api/projects/${project?.id}/setup`
    },
    {
      id: 'build',
      name: 'Build',
      icon: <Hammer className="w-4 h-4" />,
      description: 'APK generation and packaging',
      enabled: project?.status === 'setup-complete',
      endpoint: `/api/projects/${project?.id}/build`
    }
  ];

  const handleStartPhase = async (phase: any) => {
    try {
      setActivePhase(phase.id);
      
      const response = await apiRequest(phase.endpoint, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        onPhaseStart(phase.id);
      } else {
        console.error('Failed to start phase:', await response.text());
      }
    } catch (error) {
      console.error('Phase start error:', error);
    } finally {
      setActivePhase(null);
    }
  };

  const handleStopPhase = async () => {
    try {
      const response = await apiRequest(`/api/projects/${project?.id}/stop`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        onPhaseStop();
      }
    } catch (error) {
      console.error('Phase stop error:', error);
    }
  };

  const getPhaseStatus = (phase: any) => {
    if (!project) return 'disabled';
    
    if (project.status === 'analyzing' && phase.id === 'analyze') return 'active';
    if (project.status === 'setup' && phase.id === 'setup') return 'active';
    if (project.status === 'building' && phase.id === 'build') return 'active';
    if (project.status === 'completed' && phase.id === 'build') return 'completed';
    
    return phase.enabled ? 'ready' : 'disabled';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-blue-500">Active</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'ready':
        return <Badge variant="outline" className="border-green-500 text-green-600">Ready</Badge>;
      default:
        return <Badge variant="secondary">Disabled</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          Manual Phase Controls
        </CardTitle>
        <CardDescription>
          Start and stop each phase manually with comprehensive error checking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {phases.map((phase, index) => {
            const status = getPhaseStatus(phase);
            const isActive = activePhase === phase.id;
            
            return (
              <div key={phase.id}>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {phase.icon}
                      <h3 className="font-medium">{phase.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={status === 'active' ? 'destructive' : 'default'}
                      size="sm"
                      disabled={status === 'disabled' || isActive}
                      onClick={() => {
                        if (status === 'active') {
                          handleStopPhase();
                        } else {
                          handleStartPhase(phase);
                        }
                      }}
                    >
                      {isActive ? (
                        'Starting...'
                      ) : status === 'active' ? (
                        <>
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-1 ml-7">{phase.description}</p>
                
                {index < phases.length - 1 && <Separator className="my-4" />}
              </div>
            );
          })}
        </div>
        
        {project?.status === 'completed' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-green-600" />
              <span className="text-green-800 font-medium">APK Ready for Download</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              All phases completed successfully. Your APK is ready for download.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}