import { CheckCircle, Circle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/types/conversion';

interface ProjectSetupStepsProps {
  project: Project | null;
  setupResult?: {
    success: boolean;
    message: string;
    details: {
      dependencies: boolean;
      missingFiles: boolean;
      sdkSetup: boolean;
      buildTools: boolean;
    };
  };
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export function ProjectSetupSteps({ project, setupResult }: ProjectSetupStepsProps) {
  const getStepStatus = (stepId: string): 'pending' | 'running' | 'completed' | 'error' => {
    if (!project) return 'pending';
    
    const progress = project.progress || 0;
    
    switch (stepId) {
      case 'dependencies':
        if (progress < 25) return 'pending';
        if (progress < 40) return 'running';
        return setupResult?.details?.dependencies ? 'completed' : 'error';
      case 'missingFiles':
        if (progress < 40) return 'pending';
        if (progress < 50) return 'running';
        return setupResult?.details?.missingFiles ? 'completed' : 'error';
      case 'sdkSetup':
        if (progress < 50) return 'pending';
        if (progress < 60) return 'running';
        return setupResult?.details?.sdkSetup ? 'completed' : 'error';
      case 'buildTools':
        if (progress < 60) return 'pending';
        if (progress < 65) return 'running';
        return setupResult?.details?.buildTools ? 'completed' : 'error';
      default:
        return 'pending';
    }
  };

  const steps: SetupStep[] = [
    {
      id: 'dependencies',
      title: 'Installing Dependencies',
      description: 'Installing project dependencies from package.json, pubspec.yaml, or build.gradle',
      icon: <Circle className="w-5 h-5" />,
      status: getStepStatus('dependencies'),
    },
    {
      id: 'missingFiles',
      title: 'Missing Files',
      description: 'Creating missing files and directories required for the project',
      icon: <Circle className="w-5 h-5" />,
      status: getStepStatus('missingFiles'),
    },
    {
      id: 'sdkSetup',
      title: 'SDK Setup',
      description: 'Setting up required SDKs (Android SDK, Flutter SDK, Node.js, Java)',
      icon: <Circle className="w-5 h-5" />,
      status: getStepStatus('sdkSetup'),
    },
    {
      id: 'buildTools',
      title: 'Build Tools',
      description: 'Installing build tools (Gradle, CLI tools, build systems)',
      icon: <Circle className="w-5 h-5" />,
      status: getStepStatus('buildTools'),
    },
  ];

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Running</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-500">Pending</Badge>;
    }
  };

  const overallProgress = project?.progress || 0;
  const isSetupPhase = project?.status === 'setup' || project?.status === 'setup-complete';

  if (!isSetupPhase) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Project Setup Progress
        </CardTitle>
        <CardDescription>
          Comprehensive setup including dependencies, missing files, SDKs, and build tools
        </CardDescription>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="flex-shrink-0">
                {getStepIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm">{step.title}</h3>
                  {getStepBadge(step.status)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{step.description}</p>
              </div>
              <div className="flex-shrink-0 text-xs text-gray-500">
                Step {index + 1}/4
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}