import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileArchive, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileValidationResult, UploadError } from '@/types/conversion';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  uploading: boolean;
  selectedFile: File | null;
  onFileRemove: () => void;
  validationResult?: FileValidationResult;
  uploadError?: UploadError;
}

export function FileUpload({ 
  onFileSelect, 
  uploading, 
  selectedFile, 
  onFileRemove, 
  validationResult,
  uploadError 
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      // Handle rejected files from dropzone
      console.warn('Rejected files:', rejectedFiles);
    }
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500MB
    disabled: uploading,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Your Mobile App Project</h2>
          <p className="text-slate-600">Upload a ZIP file containing your mobile app project. We support React Native, Flutter, Java, Kotlin, and Cordova projects.</p>
        </div>

        {!selectedFile && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200",
              isDragActive ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50"
            )}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Upload className="text-blue-600 w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Drag & Drop Your ZIP File</h3>
                <p className="text-slate-600 mb-4">or click to browse and select your mobile app project</p>
                <Button className="bg-blue-600 hover:bg-blue-700" disabled={uploading}>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
              </div>
              <div className="text-sm text-slate-500">
                <p>Supported formats: .zip (Max size: 500MB)</p>
                <p>Supported frameworks: React Native, Flutter, Java, Kotlin, Cordova/PhoneGap</p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {validationResult && (
          <div className="mt-4 space-y-3">
            {validationResult.errors.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="font-medium mb-1">File validation failed:</div>
                  <ul className="list-disc list-inside text-sm">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {validationResult.warnings.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="font-medium mb-1">Warnings:</div>
                  <ul className="list-disc list-inside text-sm">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-1">Upload Error ({uploadError.code}):</div>
              <p className="text-sm">{uploadError.message}</p>
              {uploadError.details && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer">Technical Details</summary>
                  <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(uploadError.details, null, 2)}</pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Selected File Display */}
        {selectedFile && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                validationResult?.isValid 
                  ? "bg-green-100" 
                  : validationResult?.errors.length 
                  ? "bg-red-100" 
                  : "bg-blue-100"
              )}>
                {validationResult?.isValid ? (
                  <CheckCircle className="text-green-600 w-5 h-5" />
                ) : validationResult?.errors.length ? (
                  <AlertCircle className="text-red-600 w-5 h-5" />
                ) : (
                  <FileArchive className="text-blue-600 w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900">{selectedFile.name}</h4>
                <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                {validationResult?.isValid && (
                  <p className="text-xs text-green-600 mt-1">✓ File validation passed</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onFileRemove}
                className="text-slate-400 hover:text-slate-600"
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
