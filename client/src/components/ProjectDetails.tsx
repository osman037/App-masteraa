import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Smartphone, 
  Package, 
  Wrench, 
  BarChart3, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Code,
  TestTube,
  Image,
  FolderOpen
} from "lucide-react";

interface ProjectAnalysis {
  framework: string;
  frameworkVersion?: string;
  language: string;
  projectType: string;
  projectName?: string;
  packageName?: string;
  hasValidStructure: boolean;
  missingFiles: string[];
  dependencies: string[];
  devDependencies?: string[];
  buildConfig: {
    targetSdk?: number;
    minSdk?: number;
    compileSdk?: number;
    buildTools?: string;
    flutterVersion?: string;
    dartVersion?: string;
    reactNativeVersion?: string;
    nodeVersion?: string;
    applicationId?: string;
    versionName?: string;
    versionCode?: number;
  };
  projectStats: {
    totalFiles: number;
    sourceFiles: number;
    testFiles: number;
    assetFiles: number;
    configFiles: number;
    dependencies: number;
    devDependencies: number;
    estimatedBuildTime?: string;
    projectSize?: string;
  };
  sourceStructure: {
    mainSource?: string[];
    testSource?: string[];
    assets?: string[];
    resources?: string[];
  };
  errors: string[];
  warnings: string[];
}

interface ProjectDetailsProps {
  analysis: ProjectAnalysis;
  projectName: string;
}

const getFrameworkIcon = (framework: string) => {
  switch (framework.toLowerCase()) {
    case 'flutter':
      return '🦋';
    case 'react-native':
      return '⚛️';
    case 'android':
      return '🤖';
    case 'cordova':
      return '📱';
    default:
      return '📦';
  }
};

const formatFrameworkName = (framework: string) => {
  switch (framework.toLowerCase()) {
    case 'flutter':
      return 'Flutter';
    case 'react-native':
      return 'React Native';
    case 'android':
      return 'Android Native';
    case 'cordova':
      return 'Cordova/PhoneGap';
    default:
      return framework.charAt(0).toUpperCase() + framework.slice(1);
  }
};

export default function ProjectDetails({ analysis, projectName }: ProjectDetailsProps) {
  const { framework, buildConfig, projectStats, errors, warnings } = analysis;
  
  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Project Details</CardTitle>
              <CardDescription>Comprehensive analysis of your mobile project</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {analysis.hasValidStructure ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Valid Structure
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Issues Found
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Framework Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Framework</h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getFrameworkIcon(framework)}</span>
                <div>
                  <p className="font-medium">{formatFrameworkName(framework)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {analysis.frameworkVersion || 'Latest Version'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {analysis.language.charAt(0).toUpperCase() + analysis.language.slice(1)} Project
                  </p>
                </div>
              </div>
            </div>

            {/* Project Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Project Info</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="text-sm font-medium">{analysis.projectName || projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Package:</span>
                  <span className="text-sm font-mono">{analysis.packageName || 'Not detected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Version:</span>
                  <span className="text-sm">{buildConfig.versionName || '1.0.0'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Build Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Build Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Target SDK</p>
              <p className="text-lg font-semibold">{buildConfig.targetSdk || '-'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Min SDK</p>
              <p className="text-lg font-semibold">{buildConfig.minSdk || '-'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Build Tools</p>
              <p className="text-sm font-medium">{buildConfig.buildTools || '-'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Version Code</p>
              <p className="text-lg font-semibold">{buildConfig.versionCode || 1}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Project Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
              <p className="text-xl font-bold text-blue-600">{projectStats.totalFiles}</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <Code className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Source Files</p>
              <p className="text-xl font-bold text-green-600">{projectStats.sourceFiles}</p>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <Package className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Dependencies</p>
              <p className="text-xl font-bold text-purple-600">{projectStats.dependencies}</p>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <Image className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Assets</p>
              <p className="text-xl font-bold text-orange-600">{projectStats.assetFiles}</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Test Files</p>
              <p className="text-lg font-semibold">{projectStats.testFiles}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Project Size</p>
              <p className="text-lg font-semibold">{projectStats.projectSize || 'Unknown'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Build Time</p>
              <p className="text-lg font-semibold">{projectStats.estimatedBuildTime || '3-5 min'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dependencies */}
      {analysis.dependencies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Dependencies ({analysis.dependencies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.dependencies.slice(0, 12).map((dep, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {dep}
                </Badge>
              ))}
              {analysis.dependencies.length > 12 && (
                <Badge variant="outline" className="text-xs">
                  +{analysis.dependencies.length - 12} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors and Warnings */}
      {(errors.length > 0 || warnings.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Issues & Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {errors.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">Errors ({errors.length})</h4>
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-red-700 dark:text-red-300">{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {warnings.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">Warnings ({warnings.length})</h4>
                <div className="space-y-1">
                  {warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-yellow-700 dark:text-yellow-300">{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Missing Files */}
      {analysis.missingFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Missing Files ({analysis.missingFiles.length})
            </CardTitle>
            <CardDescription>
              These files are required for a complete {formatFrameworkName(framework)} project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.missingFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="font-mono text-gray-700 dark:text-gray-300">{file}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}