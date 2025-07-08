import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp, Terminal, FileText, Settings, Hammer, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface PhaseLogProps {
  logs: any[];
  project: any;
}

export function PhaseLog({ logs, project }: PhaseLogProps) {
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    analyze: false,
    setup: false,
    build: false
  });

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'analyze':
        return <FileText className="w-4 h-4" />;
      case 'setup':
        return <Settings className="w-4 h-4" />;
      case 'build':
        return <Hammer className="w-4 h-4" />;
      default:
        return <Terminal className="w-4 h-4" />;
    }
  };

  const getPhaseStatus = (phase: string) => {
    if (!project) return 'pending';
    
    const status = project.status;
    switch (phase) {
      case 'analyze':
        if (status === 'analyzing') return 'active';
        if (status === 'analyzed' || project.analysis) return 'completed';
        return 'pending';
      case 'setup':
        if (status === 'setup') return 'active';
        if (status === 'setup-complete') return 'completed';
        return 'pending';
      case 'build':
        if (status === 'building') return 'active';
        if (status === 'completed') return 'completed';
        return 'pending';
      default:
        return 'pending';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getPhaseLog = (phase: string) => {
    const phaseKeywords = {
      analyze: ['analysis', 'analyzing', 'framework', 'detected', 'project contains'],
      setup: ['setup', 'dependencies', 'installing', 'step', 'sdk', 'missing files'],
      build: ['build', 'building', 'apk', 'generation', 'packaging', 'completed']
    };
    
    return logs.filter(log => 
      phaseKeywords[phase]?.some(keyword => 
        log.message.toLowerCase().includes(keyword)
      )
    );
  };

  const phases = [
    { id: 'analyze', name: 'Analysis Phase', description: 'Project structure and framework detection' },
    { id: 'setup', name: 'Setup Phase', description: 'Dependencies, SDKs, and missing files' },
    { id: 'build', name: 'Build Phase', description: 'APK generation and packaging' }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Phase Logs
        </CardTitle>
        <CardDescription>
          Detailed logs for each phase with real-time updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {phases.map((phase, index) => {
            const status = getPhaseStatus(phase.id);
            const phaseLogs = getPhaseLog(phase.id);
            const isExpanded = expandedPhases[phase.id];
            
            return (
              <div key={phase.id}>
                <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50" 
                     onClick={() => togglePhase(phase.id)}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getPhaseIcon(phase.id)}
                      <h3 className="font-medium">{phase.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(status)}
                      <Badge variant="outline" className="text-xs">
                        {phaseLogs.length} logs
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">{phase.description}</p>
                    
                    {phaseLogs.length > 0 ? (
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {phaseLogs.map((log, logIndex) => (
                            <div key={logIndex} className="flex items-start gap-2 text-sm">
                              <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                log.level === 'error' ? 'bg-red-500' :
                                log.level === 'warning' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-500">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {log.level}
                                  </Badge>
                                </div>
                                <p className="text-gray-700">{log.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No logs yet for this phase</p>
                    )}
                  </div>
                )}
                
                {index < phases.length - 1 && <Separator className="my-4" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}