# Phase 1 Testing Guide - Upload & Validation

## Overview
This document provides step-by-step testing procedures for Phase 1 of the Mobile App to APK Converter, focusing on file upload and validation functionality.

## Test Environment Setup

### Prerequisites
- Application running on localhost:5000
- Access to test ZIP files
- Browser developer tools open for monitoring

### Test Data Required
1. **Valid ZIP files** (5-10MB, 50-100MB, 200-400MB)
2. **Invalid files** (.txt, .jpg, .pdf, corrupted ZIP)
3. **Edge cases** (empty ZIP, very large files, special characters in names)

## Testing Scenarios

### 1. File Validation Tests

#### Test 1.1: Valid ZIP File Upload
**Objective**: Verify successful validation of a valid ZIP file

**Steps**:
1. Navigate to the upload interface
2. Drag and drop a valid ZIP file (10-50MB)
3. Observe validation feedback

**Expected Results**:
- ✅ File validation passes
- ✅ Green checkmark displayed
- ✅ No error messages
- ✅ "File validation passed" message shown

**Test Data**: `react-native-project.zip` (15MB)

#### Test 1.2: Invalid File Format
**Objective**: Verify rejection of non-ZIP files

**Steps**:
1. Attempt to upload .txt file
2. Attempt to upload .jpg image
3. Attempt to upload .pdf document

**Expected Results**:
- ❌ Validation fails immediately
- ❌ "Only ZIP files are supported" error
- ❌ Red error alert displayed
- ❌ File rejected by dropzone

**Test Data**: `document.txt`, `image.jpg`, `manual.pdf`

#### Test 1.3: File Size Validation
**Objective**: Test file size limits and warnings

**Steps**:
1. Upload 100MB ZIP file (should show warning)
2. Upload 600MB ZIP file (should be rejected)
3. Upload empty ZIP file (should be rejected)

**Expected Results**:
- 100MB: ⚠️ Warning "Large file detected" but accepted
- 600MB: ❌ "File size exceeds maximum limit" error
- Empty: ❌ "File is empty" error

#### Test 1.4: ZIP Structure Validation
**Objective**: Verify ZIP file integrity checking

**Steps**:
1. Upload valid ZIP file
2. Upload corrupted ZIP file (rename .txt to .zip)
3. Upload file with ZIP extension but non-ZIP content

**Expected Results**:
- Valid ZIP: ✅ Passes validation
- Corrupted: ❌ "File is not a valid ZIP archive"
- Fake ZIP: ❌ "File is not a valid ZIP archive"

### 2. Upload Process Tests

#### Test 2.1: Successful Upload Flow
**Objective**: Test complete upload and extraction process

**Steps**:
1. Select valid ZIP file
2. Click upload or use auto-upload
3. Monitor progress bar
4. Verify extraction completion

**Expected Results**:
- Progress updates from 0-100%
- Upload logs in console
- Project created with status "extracted"
- Files extracted to project directory

#### Test 2.2: Upload Progress Tracking
**Objective**: Verify real-time upload progress

**Steps**:
1. Upload large file (100MB+)
2. Monitor progress bar updates
3. Check browser network tab for upload progress

**Expected Results**:
- Progress bar updates smoothly
- Percentage increases incrementally
- Network tab shows upload progress
- No freezing or hanging

#### Test 2.3: Upload Error Handling
**Objective**: Test error scenarios during upload

**Steps**:
1. Disconnect network during upload
2. Upload while server is down
3. Upload corrupted ZIP file

**Expected Results**:
- Network error: Clear error message with retry option
- Server down: "Server unavailable" error
- Corrupted file: "ZIP extraction failed" error

### 3. User Interface Tests

#### Test 3.1: Drag & Drop Interface
**Objective**: Test drag and drop functionality

**Steps**:
1. Drag file over upload area
2. Observe visual feedback
3. Drop file to upload
4. Test drag with invalid file

**Expected Results**:
- Visual feedback during drag (border highlight)
- Smooth drop animation
- Invalid files trigger immediate error
- Multiple files only accepts first one

#### Test 3.2: File Selection Browser
**Objective**: Test click-to-browse functionality

**Steps**:
1. Click "Choose File" button
2. Select file from browser dialog
3. Cancel file selection
4. Select multiple files

**Expected Results**:
- File browser opens correctly
- Selected file appears in interface
- Cancel works without errors
- Only one file selected from multiple

#### Test 3.3: Error Display
**Objective**: Verify error message presentation

**Steps**:
1. Trigger various validation errors
2. Check error message clarity
3. Verify error dismissal
4. Test multiple simultaneous errors

**Expected Results**:
- Errors displayed prominently in red alerts
- Clear, user-friendly error messages
- Errors dismissible or auto-clear
- Multiple errors stacked properly

### 4. API Integration Tests

#### Test 4.1: File Validation API
**Objective**: Test server-side validation endpoint

**API Call**:
```bash
curl -X POST http://localhost:5000/api/projects/validate \
  -F "file=@test-project.zip"
```

**Expected Response**:
```json
{
  "isValid": true,
  "errors": [],
  "warnings": ["Large file detected. Upload may take longer"],
  "fileInfo": {
    "name": "test-project.zip",
    "size": 104857600,
    "type": "application/zip",
    "lastModified": "2025-07-08T02:00:00.000Z"
  },
  "zipValid": true
}
```

#### Test 4.2: File Upload API
**Objective**: Test complete upload and extraction

**API Call**:
```bash
curl -X POST http://localhost:5000/api/projects/upload \
  -F "file=@valid-project.zip"
```

**Expected Response**:
```json
{
  "project": {
    "id": 1,
    "name": "valid-project",
    "status": "extracted",
    "progress": 25
  },
  "message": "File uploaded and extracted successfully",
  "nextStep": "analysis"
}
```

### 5. Performance Tests

#### Test 5.1: Large File Handling
**Objective**: Test performance with large files

**Metrics to Monitor**:
- Upload time for 500MB file
- Memory usage during upload
- Browser responsiveness
- Server resource consumption

**Acceptable Thresholds**:
- Upload time: <30 seconds for 500MB
- Memory usage: <2GB total
- UI remains responsive
- Server CPU <80%

#### Test 5.2: Concurrent Uploads
**Objective**: Test multiple simultaneous uploads

**Steps**:
1. Open multiple browser tabs
2. Upload different files simultaneously
3. Monitor server logs and performance

**Expected Results**:
- All uploads complete successfully
- No file corruption or mixing
- Server handles load gracefully
- Clear error if limits exceeded

### 6. Edge Case Tests

#### Test 6.1: Special Characters in Filenames
**Test Files**:
- `file with spaces.zip`
- `file-with-dashes.zip`
- `файл_с_русскими_символами.zip`
- `file@with#special$chars.zip`

**Expected Results**:
- Most special characters handled properly
- Invalid characters show clear error
- Unicode filenames supported
- Path traversal attempts blocked

#### Test 6.2: Very Long Filenames
**Test Cases**:
- 255 character filename (max allowed)
- 300 character filename (should be rejected)

**Expected Results**:
- 255 chars: Accepted
- 300 chars: "File name is too long" error

### 7. Security Tests

#### Test 7.1: Path Traversal Prevention
**Malicious Filenames**:
- `../../../etc/passwd.zip`
- `..\\..\\windows\\system32.zip`

**Expected Results**:
- All path traversal attempts blocked
- "File name contains invalid characters" error
- No server file system access

#### Test 7.2: File Content Validation
**Test Cases**:
- ZIP bomb (highly compressed malicious ZIP)
- ZIP with executable files
- ZIP with symbolic links

**Expected Results**:
- ZIP bombs detected and rejected
- Large extraction sizes prevented
- Symbolic links handled safely

## Test Automation

### Automated Test Script
```bash
#!/bin/bash
# Phase 1 Automated Testing Script

echo "Starting Phase 1 Upload Tests..."

# Test 1: Valid file upload
echo "Test 1: Valid ZIP upload"
curl -X POST http://localhost:5000/api/projects/validate \
  -F "file=@test-files/valid-project.zip" \
  -w "Status: %{http_code}\n"

# Test 2: Invalid file type
echo "Test 2: Invalid file type"
curl -X POST http://localhost:5000/api/projects/validate \
  -F "file=@test-files/document.txt" \
  -w "Status: %{http_code}\n"

# Test 3: File too large
echo "Test 3: Oversized file"
curl -X POST http://localhost:5000/api/projects/validate \
  -F "file=@test-files/large-file.zip" \
  -w "Status: %{http_code}\n"

echo "Phase 1 tests completed!"
```

## Success Criteria

### Phase 1 is considered successful when:

1. **File Validation** ✅
   - All valid ZIP files pass validation
   - Invalid files are properly rejected
   - Clear error messages for all failure cases

2. **Upload Process** ✅
   - Files upload with progress tracking
   - ZIP extraction works reliably
   - Project records created correctly

3. **Error Handling** ✅
   - Network errors handled gracefully
   - Server errors display helpful messages
   - User can retry failed operations

4. **User Experience** ✅
   - Drag & drop works smoothly
   - Visual feedback is clear and immediate
   - Interface remains responsive during uploads

5. **Security** ✅
   - Path traversal attacks prevented
   - File size limits enforced
   - ZIP bombs and malicious content blocked

6. **Performance** ✅
   - Large files upload within acceptable time
   - Memory usage stays reasonable
   - Server handles concurrent uploads

## Next Steps

After Phase 1 validation passes all tests:
1. Proceed to Phase 2: Project Analysis
2. Update progress tracker
3. Begin framework detection testing
4. Implement dependency analysis validation

## Troubleshooting

### Common Issues and Solutions

**Issue**: "File validation failed" for valid ZIP
**Solution**: Check ZIP file integrity, ensure proper compression

**Issue**: Upload progress stuck at 0%
**Solution**: Verify network connection, check server logs

**Issue**: "Server error during validation"
**Solution**: Check server console for detailed error messages

**Issue**: Large files fail to upload
**Solution**: Verify multer configuration and disk space

**Issue**: Drag & drop not working
**Solution**: Check browser permissions and JavaScript errors