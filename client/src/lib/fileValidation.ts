import { FileValidationResult, UploadError } from '@/types/conversion';

export class FileValidator {
  private static readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  private static readonly ALLOWED_EXTENSIONS = ['.zip'];
  private static readonly ALLOWED_MIME_TYPES = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip'
  ];

  static validateFile(file: File): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic file info
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified)
    };

    // Check if file exists
    if (!file) {
      errors.push('No file selected');
      return {
        isValid: false,
        errors,
        warnings,
        fileInfo
      };
    }

    // Check file extension
    const hasValidExtension = this.ALLOWED_EXTENSIONS.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    if (!hasValidExtension) {
      errors.push(`Invalid file type. Only ${this.ALLOWED_EXTENSIONS.join(', ')} files are supported`);
    }

    // Check MIME type
    const hasValidMimeType = this.ALLOWED_MIME_TYPES.includes(file.type) || file.type === '';
    if (!hasValidMimeType && file.type !== '') {
      warnings.push(`Unexpected file type: ${file.type}. Expected ZIP format`);
    }

    // Check file size
    if (file.size === 0) {
      errors.push('File is empty');
    } else if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum limit (${this.formatFileSize(this.MAX_FILE_SIZE)})`);
    }

    // Check file name
    if (file.name.length > 255) {
      errors.push('File name is too long (maximum 255 characters)');
    }

    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      errors.push('File name contains invalid characters');
    }

    // Size warnings
    if (file.size > 100 * 1024 * 1024) { // 100MB
      warnings.push('Large file detected. Upload may take longer');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo
    };
  }

  static async validateZipStructure(file: File): Promise<FileValidationResult> {
    const basicValidation = this.validateFile(file);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    try {
      // Check if it's a valid ZIP file by trying to read the first few bytes
      const arrayBuffer = await file.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // ZIP file signature: 'PK' (0x50 0x4B)
      const isZipFile = bytes[0] === 0x50 && bytes[1] === 0x4B;
      
      if (!isZipFile) {
        basicValidation.errors.push('File is not a valid ZIP archive');
        basicValidation.isValid = false;
      }

      return basicValidation;
    } catch (error) {
      basicValidation.errors.push('Unable to validate ZIP file structure');
      basicValidation.isValid = false;
      return basicValidation;
    }
  }

  static createUploadError(code: string, message: string, details?: any): UploadError {
    return {
      code,
      message,
      details,
      timestamp: new Date()
    };
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getFrameworkHints(fileName: string): string[] {
    const hints: string[] = [];
    const lowerName = fileName.toLowerCase();

    if (lowerName.includes('react') || lowerName.includes('rn') || lowerName.includes('native')) {
      hints.push('Possible React Native project');
    }
    if (lowerName.includes('flutter') || lowerName.includes('dart')) {
      hints.push('Possible Flutter project');
    }
    if (lowerName.includes('android') || lowerName.includes('gradle')) {
      hints.push('Possible Android project');
    }
    if (lowerName.includes('cordova') || lowerName.includes('phonegap')) {
      hints.push('Possible Cordova/PhoneGap project');
    }

    return hints;
  }
}