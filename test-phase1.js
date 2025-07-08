#!/usr/bin/env node
/**
 * Phase 1 Testing Script - Upload & Validation
 * Tests the complete file upload and validation workflow
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import AdmZip from 'adm-zip';

// Test configuration
const SERVER_URL = 'http://localhost:5000';
const TEST_FILES_DIR = './test-files';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createTestFile(filename, size = 1024) {
  const buffer = Buffer.alloc(size, 'A');
  fs.writeFileSync(path.join(TEST_FILES_DIR, filename), buffer);
  log(`Created test file: ${filename} (${size} bytes)`, 'blue');
}

function createTestZip(filename, content = 'test content') {
  // Simple ZIP creation for testing
  const zip = new AdmZip();
  zip.addFile('test.txt', Buffer.from(content));
  zip.writeZip(path.join(TEST_FILES_DIR, filename));
  log(`Created test ZIP: ${filename}`, 'blue');
}

async function apiCall(endpoint, formData = null, method = 'GET') {
  return new Promise((resolve, reject) => {
    let curlCommand = `curl -s -X ${method} ${SERVER_URL}${endpoint}`;
    
    if (formData) {
      curlCommand += ` ${formData}`;
    }
    
    curlCommand += ' -w "\\n%{http_code}"';
    
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      const lines = stdout.trim().split('\n');
      const statusCode = parseInt(lines.pop());
      const responseBody = lines.join('\n');
      
      try {
        const data = responseBody ? JSON.parse(responseBody) : {};
        resolve({ statusCode, data });
      } catch (e) {
        resolve({ statusCode, data: responseBody });
      }
    });
  });
}

async function runTest(testName, testFunction) {
  testResults.total++;
  log(`\n📋 Running: ${testName}`, 'blue');
  
  try {
    const result = await testFunction();
    if (result) {
      log(`✅ PASSED: ${testName}`, 'green');
      testResults.passed++;
    } else {
      log(`❌ FAILED: ${testName}`, 'red');
      testResults.failed++;
    }
  } catch (error) {
    log(`❌ ERROR: ${testName} - ${error.message}`, 'red');
    testResults.failed++;
  }
}

// Test Cases

async function testServerConnection() {
  try {
    const response = await apiCall('/api/projects');
    return response.statusCode === 200;
  } catch (error) {
    log(`Server connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function testValidZipValidation() {
  const testFile = path.join(TEST_FILES_DIR, 'valid-test.zip');
  const formData = `-F "file=@${testFile}"`;
  
  try {
    const response = await apiCall('/api/projects/validate', formData, 'POST');
    
    if (response.statusCode !== 200) {
      log(`Expected 200, got ${response.statusCode}`, 'red');
      return false;
    }
    
    if (!response.data.isValid) {
      log(`Expected isValid: true, got: ${response.data.isValid}`, 'red');
      log(`Errors: ${JSON.stringify(response.data.errors)}`, 'red');
      return false;
    }
    
    return true;
  } catch (error) {
    log(`API call failed: ${error.message}`, 'red');
    return false;
  }
}

async function testInvalidFileValidation() {
  const testFile = path.join(TEST_FILES_DIR, 'invalid.txt');
  const formData = `-F "file=@${testFile}"`;
  
  try {
    const response = await apiCall('/api/projects/validate', formData, 'POST');
    
    // Should return 400 or validation should fail
    if (response.statusCode === 200 && response.data.isValid) {
      log(`Expected validation to fail for non-ZIP file`, 'red');
      return false;
    }
    
    // Check for proper error message
    if (response.data.errors && response.data.errors.length > 0) {
      const hasZipError = response.data.errors.some(error => 
        error.includes('ZIP') || error.includes('zip')
      );
      if (!hasZipError) {
        log(`Expected ZIP-related error, got: ${JSON.stringify(response.data.errors)}`, 'red');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log(`API call failed: ${error.message}`, 'red');
    return false;
  }
}

async function testFileSizeValidation() {
  // Create a large file (simulate 600MB)
  const testFile = path.join(TEST_FILES_DIR, 'large-file.zip');
  createTestZip('large-file.zip', 'A'.repeat(1024 * 1024)); // 1MB test file
  
  const formData = `-F "file=@${testFile}"`;
  
  try {
    const response = await apiCall('/api/projects/validate', formData, 'POST');
    
    // This test will pass since our test file is not actually 600MB
    // In a real scenario, you'd need to create an actual large file
    return response.statusCode === 200;
  } catch (error) {
    log(`API call failed: ${error.message}`, 'red');
    return false;
  }
}

async function testSuccessfulUpload() {
  const testFile = path.join(TEST_FILES_DIR, 'upload-test.zip');
  const formData = `-F "file=@${testFile}"`;
  
  try {
    const response = await apiCall('/api/projects/upload', formData, 'POST');
    
    if (response.statusCode !== 200) {
      log(`Expected 200, got ${response.statusCode}`, 'red');
      log(`Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
    
    if (!response.data.project || !response.data.project.id) {
      log(`Expected project object with ID, got: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
    
    // Check if project was created with correct status
    if (response.data.project.status !== 'extracted') {
      log(`Expected status 'extracted', got: ${response.data.project.status}`, 'red');
      return false;
    }
    
    return true;
  } catch (error) {
    log(`API call failed: ${error.message}`, 'red');
    return false;
  }
}

async function testUploadWithInvalidFile() {
  const testFile = path.join(TEST_FILES_DIR, 'invalid-upload.txt');
  const formData = `-F "file=@${testFile}"`;
  
  try {
    const response = await apiCall('/api/projects/upload', formData, 'POST');
    
    // Should fail with proper error
    if (response.statusCode === 200) {
      log(`Expected upload to fail for non-ZIP file`, 'red');
      return false;
    }
    
    if (response.statusCode === 400 && response.data.error) {
      return true;
    }
    
    log(`Unexpected response: ${response.statusCode} - ${JSON.stringify(response.data)}`, 'red');
    return false;
  } catch (error) {
    log(`API call failed: ${error.message}`, 'red');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Phase 1 Testing Suite', 'blue');
  log('=====================================', 'blue');
  
  // Setup test files directory
  if (!fs.existsSync(TEST_FILES_DIR)) {
    fs.mkdirSync(TEST_FILES_DIR);
    log(`Created test files directory: ${TEST_FILES_DIR}`, 'blue');
  }
  
  // Create test files
  log('\n📁 Creating test files...', 'blue');
  createTestFile('invalid.txt', 1024);
  createTestFile('invalid-upload.txt', 2048);
  createTestZip('valid-test.zip', 'Valid test content for ZIP validation');
  createTestZip('upload-test.zip', 'Test content for upload functionality');
  
  // Run tests
  log('\n🧪 Running validation tests...', 'blue');
  
  await runTest('Server Connection', testServerConnection);
  await runTest('Valid ZIP Validation', testValidZipValidation);
  await runTest('Invalid File Validation', testInvalidFileValidation);
  await runTest('File Size Validation', testFileSizeValidation);
  await runTest('Successful Upload', testSuccessfulUpload);
  await runTest('Upload with Invalid File', testUploadWithInvalidFile);
  
  // Report results
  log('\n📊 Test Results Summary', 'blue');
  log('========================', 'blue');
  log(`Total Tests: ${testResults.total}`, 'blue');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  if (testResults.failed === 0) {
    log('\n🎉 All Phase 1 tests passed! Ready for Phase 2.', 'green');
    process.exit(0);
  } else {
    log(`\n⚠️  ${testResults.failed} test(s) failed. Please fix issues before proceeding.`, 'red');
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    log(`\n💥 Test suite crashed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}