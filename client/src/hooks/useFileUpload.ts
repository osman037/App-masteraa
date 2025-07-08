import { useState, useCallback } from 'react';
import { FileValidator } from '@/lib/fileValidation';
import { FileValidationResult, UploadError } from '@/types/conversion';
import { apiRequest } from '@/lib/queryClient';

export interface UseFileUploadOptions {
  onSuccess?: (project: any) => void;
  onError?: (error: UploadError) => void;
  onProgress?: (progress: number) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null);
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = useCallback(async (file: File): Promise<FileValidationResult> => {
    console.log('Validating file:', file.name);
    
    // Client-side validation first
    const clientValidation = FileValidator.validateFile(file);
    
    // If client validation fails, return immediately
    if (!clientValidation.isValid) {
      setValidationResult(clientValidation);
      return clientValidation;
    }

    try {
      // Server-side validation for ZIP structure
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/projects/validate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const serverValidation: FileValidationResult = {
          isValid: false,
          errors: [errorData.error || 'Server validation failed'],
          warnings: clientValidation.warnings,
          fileInfo: clientValidation.fileInfo
        };
        setValidationResult(serverValidation);
        return serverValidation;
      }

      const serverValidation: FileValidationResult = await response.json();
      
      // Combine client and server validation results
      const combinedValidation: FileValidationResult = {
        isValid: clientValidation.isValid && serverValidation.isValid,
        errors: [...clientValidation.errors, ...serverValidation.errors],
        warnings: [...clientValidation.warnings, ...serverValidation.warnings],
        fileInfo: clientValidation.fileInfo
      };

      setValidationResult(combinedValidation);
      return combinedValidation;
      
    } catch (error) {
      console.error('Validation error:', error);
      const errorValidation: FileValidationResult = {
        isValid: false,
        errors: [...clientValidation.errors, 'Failed to validate file on server'],
        warnings: clientValidation.warnings,
        fileInfo: clientValidation.fileInfo
      };
      setValidationResult(errorValidation);
      return errorValidation;
    }
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    console.log('File selected:', file.name);
    setSelectedFile(file);
    setUploadError(null);
    setUploadProgress(0);

    // Validate the file
    const validation = await validateFile(file);
    
    if (!validation.isValid) {
      console.log('File validation failed:', validation.errors);
      setUploadError(FileValidator.createUploadError(
        'VALIDATION_FAILED',
        'File validation failed: ' + validation.errors.join(', ')
      ));
    }
  }, [validateFile]);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setValidationResult(null);
    setUploadError(null);
    setUploadProgress(0);
  }, []);

  const uploadFile = useCallback(async (): Promise<any> => {
    if (!selectedFile) {
      throw new Error('No file selected');
    }

    if (validationResult && !validationResult.isValid) {
      throw new Error('File validation failed');
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Create XMLHttpRequest for progress tracking
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(progress);
            options.onProgress?.(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.responseText, { status: xhr.status }));
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', '/api/projects/upload');
        xhr.send(formData);
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      setUploadProgress(100);
      options.onSuccess?.(result.project);
      return result;

    } catch (error: any) {
      console.error('Upload error:', error);
      
      const uploadError = FileValidator.createUploadError(
        'UPLOAD_FAILED',
        error.message || 'Upload failed',
        error
      );
      
      setUploadError(uploadError);
      options.onError?.(uploadError);
      throw error;
    } finally {
      setUploading(false);
    }
  }, [selectedFile, validationResult, options]);

  return {
    selectedFile,
    uploading,
    validationResult,
    uploadError,
    uploadProgress,
    handleFileSelect,
    handleFileRemove,
    uploadFile,
    validateFile
  };
}