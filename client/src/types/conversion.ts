export interface Project {
  id: number;
  name: string;
  originalFileName: string;
  fileSize: number;
  framework?: string;
  status: 'uploaded' | 'extracted' | 'analyzing' | 'analyzed' | 'setup' | 'setup-complete' | 'building' | 'completed' | 'error';
  progress: number;
  buildConfig?: any;
  projectStats?: ProjectStats;
  analysis?: string; // JSON string of ProjectAnalysis
  logs?: any[];
  apkPath?: string;
  apkSize?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProjectStats {
  totalFiles: number;
  sourceFiles: number;
  dependencies: number;
  targetSdk?: number;
  minSdk?: number;
  buildTools?: string;
}

export interface BuildLog {
  id: number;
  projectId: number;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

export interface ConversionStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  icon: string;
  color: string;
}

export interface FileUploadState {
  file: File | null;
  uploading: boolean;
  progress: number;
  error: string | null;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    lastModified: Date;
  };
}

export interface UploadError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}
