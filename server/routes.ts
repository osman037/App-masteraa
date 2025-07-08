import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}
import path from "path";
import { storage } from "./storage";
import { FileManager } from "./services/fileManager";
import { ProjectAnalyzer } from "./services/projectAnalyzer";
import { ApkBuilder } from "./services/apkBuilder";
import { insertProjectSchema, insertBuildLogSchema } from "@shared/schema";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });
const fileManager = new FileManager();
const projectAnalyzer = new ProjectAnalyzer(fileManager);
const apkBuilder = new ApkBuilder(fileManager);

// Utility function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Automatic project setup function
async function triggerAutomaticSetup(projectId: number): Promise<void> {
  try {
    const project = await storage.getProject(projectId);
    if (!project || !project.analysis) return;

    await storage.addBuildLog({
      projectId,
      level: "info",
      message: "Automatically starting comprehensive project setup..."
    });

    await storage.updateProject(projectId, {
      status: "setup",
      progress: 25,
    });

    const analysis = JSON.parse(project.analysis);
    const projectDir = await fileManager.getProjectDirectory(projectId);
    
    // Step 1: Dependencies
    await storage.addBuildLog({
      projectId,
      level: "info",
      message: "STEP 1/4: Installing project dependencies..."
    });
    
    const dependencyResult = await apkBuilder.installDependencies(projectDir, analysis);
    for (const log of dependencyResult.logs) {
      await storage.addBuildLog({ projectId, level: "info", message: log });
    }
    await storage.updateProject(projectId, { progress: 30 });

    // Step 2: Missing Files
    await storage.addBuildLog({
      projectId,
      level: "info",
      message: "STEP 2/4: Creating missing files and directories..."
    });
    
    const missingFilesResult = await apkBuilder.detectAndCreateMissingFiles(projectDir, analysis);
    for (const log of missingFilesResult.logs) {
      await storage.addBuildLog({ projectId, level: "info", message: log });
    }
    await storage.updateProject(projectId, { progress: 40 });

    // Step 3: SDK Setup
    await storage.addBuildLog({
      projectId,
      level: "info",
      message: "STEP 3/4: Setting up required SDKs..."
    });
    
    const sdkResult = await apkBuilder.setupSDKAndEnvironment(projectDir, analysis);
    for (const log of sdkResult.logs) {
      await storage.addBuildLog({ projectId, level: "info", message: log });
    }
    await storage.updateProject(projectId, { progress: 50 });

    // Step 4: Build Tools
    await storage.addBuildLog({
      projectId,
      level: "info",
      message: "STEP 4/4: Installing build tools..."
    });
    
    const buildToolsResult = await apkBuilder.installBuildTools(projectDir, analysis);
    for (const log of buildToolsResult.logs) {
      await storage.addBuildLog({ projectId, level: "info", message: log });
    }
    
    await storage.updateProject(projectId, {
      status: "setup-complete",
      progress: 60,
    });

    await storage.addBuildLog({
      projectId,
      level: "info",
      message: "Project setup completed successfully! Starting APK generation..."
    });

    // Automatically trigger APK build after setup
    setTimeout(async () => {
      await triggerAutomaticBuild(projectId);
    }, 2000);

  } catch (error: any) {
    await storage.addBuildLog({
      projectId,
      level: "error",
      message: `Automatic setup failed: ${error.message}`
    });
    await storage.updateProject(projectId, { status: "error" });
  }
}

// Automatic APK build function
async function triggerAutomaticBuild(projectId: number): Promise<void> {
  try {
    const project = await storage.getProject(projectId);
    if (!project) return;

    await storage.addBuildLog({
      projectId,
      level: "info",
      message: "Automatically starting APK build process..."
    });

    await storage.updateProject(projectId, {
      status: "building",
      progress: 60,
    });

    const projectDir = await fileManager.getProjectDirectory(projectId);
    const analysis = await projectAnalyzer.analyzeProject(projectDir);

    // Build APK with automatic progress updates
    const buildResult = await apkBuilder.buildApk(
      projectDir,
      analysis,
      async (progress, message) => {
        await storage.updateProject(projectId, { progress });
        await storage.addBuildLog({
          projectId,
          level: "info",
          message,
        });
      }
    );

    // Update project with build results
    if (buildResult.success) {
      await storage.updateProject(projectId, {
        status: "completed",
        progress: 100,
        apkPath: buildResult.apkPath,
        apkSize: buildResult.apkSize,
      });
      
      await storage.addBuildLog({
        projectId,
        level: "info",
        message: "🎉 APK generation completed successfully! Ready for download."
      });
    } else {
      await storage.updateProject(projectId, {
        status: "error",
        progress: 100,
      });
    }

    // Add all build logs
    for (const log of buildResult.logs) {
      await storage.addBuildLog({
        projectId,
        level: "info",
        message: log,
      });
    }

    for (const error of buildResult.errors) {
      await storage.addBuildLog({
        projectId,
        level: "error",
        message: error,
      });
    }

  } catch (error: any) {
    await storage.addBuildLog({
      projectId,
      level: "error",
      message: `Automatic build failed: ${error.message}`
    });
    await storage.updateProject(projectId, { status: "error" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Validate uploaded file
  app.post("/api/projects/validate", upload.single("file"), async (req: RequestWithFile, res) => {
    try {
      console.log("File validation request received");
      
      if (!req.file) {
        return res.status(400).json({
          isValid: false,
          errors: ["No file uploaded"],
          warnings: [],
          fileInfo: null
        });
      }

      const { originalname, buffer, size, mimetype } = req.file;
      console.log(`Validating file: ${originalname}, size: ${size}, type: ${mimetype}`);
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // File extension validation
      if (!originalname.toLowerCase().endsWith('.zip')) {
        errors.push("Only ZIP files are supported");
      }
      
      // File size validation
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (size === 0) {
        errors.push("File is empty");
      } else if (size > maxSize) {
        errors.push(`File size (${formatFileSize(size)}) exceeds maximum limit (${formatFileSize(maxSize)})`);
      }
      
      // MIME type validation
      const allowedMimeTypes = ['application/zip', 'application/x-zip-compressed', 'application/x-zip'];
      if (mimetype && !allowedMimeTypes.includes(mimetype)) {
        warnings.push(`Unexpected file type: ${mimetype}. Expected ZIP format`);
      }
      
      // File name validation
      if (originalname.length > 255) {
        errors.push("File name is too long (maximum 255 characters)");
      }
      
      if (originalname.includes('..') || originalname.includes('/') || originalname.includes('\\')) {
        errors.push("File name contains invalid characters");
      }
      
      // ZIP structure validation
      let zipValid = true;
      try {
        // Check ZIP signature (first 4 bytes)
        const signature = buffer.slice(0, 4);
        if (signature[0] !== 0x50 || signature[1] !== 0x4B) {
          errors.push("File is not a valid ZIP archive");
          zipValid = false;
        }
      } catch (error) {
        errors.push("Unable to validate ZIP file structure");
        zipValid = false;
      }
      
      // Size warnings
      if (size > 100 * 1024 * 1024) { // 100MB
        warnings.push("Large file detected. Upload may take longer");
      }
      
      const fileInfo = {
        name: originalname,
        size,
        type: mimetype || 'application/zip',
        lastModified: new Date()
      };
      
      res.json({
        isValid: errors.length === 0,
        errors,
        warnings,
        fileInfo,
        zipValid
      });
      
    } catch (error) {
      console.error("File validation error:", error);
      res.status(500).json({
        isValid: false,
        errors: ["Internal server error during file validation"],
        warnings: [],
        fileInfo: null
      });
    }
  });

  // Upload project file
  app.post("/api/projects/upload", upload.single("file"), async (req: RequestWithFile, res) => {
    try {
      console.log("Upload request received");
      console.log("File in request:", !!req.file);
      
      if (!req.file) {
        console.log("No file in request");
        return res.status(400).json({ 
          error: "No file uploaded",
          code: "NO_FILE",
          timestamp: new Date().toISOString()
        });
      }

      const { originalname, buffer, size, mimetype } = req.file;
      console.log(`File details: ${originalname}, size: ${size}, type: ${mimetype}`);
      
      // Comprehensive file validation
      const errors: string[] = [];
      
      // File extension validation
      if (!originalname.toLowerCase().endsWith('.zip')) {
        errors.push("Only ZIP files are supported");
      }
      
      // File size validation
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (size === 0) {
        errors.push("File is empty");
      } else if (size > maxSize) {
        errors.push(`File size exceeds maximum limit of ${formatFileSize(maxSize)}`);
      }
      
      // ZIP structure validation
      try {
        const signature = buffer.slice(0, 4);
        if (signature[0] !== 0x50 || signature[1] !== 0x4B) {
          errors.push("File is not a valid ZIP archive");
        }
      } catch (error) {
        errors.push("Unable to validate ZIP file structure");
      }
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: "File validation failed",
          code: "VALIDATION_FAILED",
          details: errors,
          timestamp: new Date().toISOString()
        });
      }

      // Create project record first
      const project = await storage.createProject({
        name: originalname.replace('.zip', ''),
        originalFileName: originalname,
        fileSize: size,
        status: "uploaded",
        progress: 10,
      });

      // Log the upload step
      await storage.addBuildLog({
        projectId: project.id,
        level: "info",
        message: `File upload started: ${originalname} (${formatFileSize(size)})`
      });
      
      try {
        // Save the uploaded file
        const filename = `${Date.now()}_${originalname}`;
        const savedFilePath = await fileManager.saveUploadedFile(buffer, filename);
        console.log("File saved to:", savedFilePath);
        
        await storage.addBuildLog({
          projectId: project.id,
          level: "info",
          message: `File saved successfully: ${filename}`
        });
        
        // Update progress
        await storage.updateProject(project.id, {
          status: "uploaded",
          progress: 15,
        });
        
        // Extract the ZIP file
        const projectDir = await fileManager.getProjectDirectory(project.id);
        
        await storage.addBuildLog({
          projectId: project.id,
          level: "info",
          message: "Extracting ZIP file..."
        });
        
        await fileManager.extractZip(savedFilePath, projectDir);
        console.log("ZIP extracted to:", projectDir);
        
        await storage.addBuildLog({
          projectId: project.id,
          level: "info",
          message: `ZIP file extracted successfully to: ${projectDir}`
        });
        
        // Update project status
        await storage.updateProject(project.id, {
          status: "extracted",
          progress: 25,
        });
        
        const updatedProject = await storage.getProject(project.id);
        
        // Automatically trigger analysis after successful extraction
        setTimeout(async () => {
          try {
            await storage.addBuildLog({
              projectId: project.id,
              level: "info",
              message: "Automatically starting project analysis..."
            });
            
            // Trigger automatic analysis
            const projectDir = await fileManager.getProjectDirectory(project.id);
            const analysis = await projectAnalyzer.analyzeProject(projectDir);
            
            await storage.updateProject(project.id, {
              status: "analyzed",
              progress: 50,
              analysis: JSON.stringify(analysis),
            });
            
            await storage.addBuildLog({
              projectId: project.id,
              level: "info",
              message: `Analysis complete. Framework detected: ${analysis.framework}`
            });
            
            // Automatically trigger project setup after analysis
            setTimeout(async () => {
              await triggerAutomaticSetup(project.id);
            }, 2000);
            
          } catch (error: any) {
            await storage.addBuildLog({
              projectId: project.id,
              level: "error",
              message: `Automatic analysis failed: ${error.message}`
            });
          }
        }, 3000);
        
        res.json({ 
          project: updatedProject,
          message: "File uploaded and extracted successfully - automatic processing started",
          nextStep: "automatic_analysis"
        });
        
      } catch (extractError: any) {
        console.error("Extraction error:", extractError);
        
        await storage.addBuildLog({
          projectId: project.id,
          level: "error",
          message: `ZIP extraction failed: ${extractError.message}`
        });
        
        await storage.updateProject(project.id, {
          status: "error",
          progress: 0,
        });
        
        res.status(500).json({ 
          error: "Failed to extract ZIP file",
          code: "EXTRACTION_FAILED",
          details: extractError.message,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error: any) {
      console.error("Upload error:", error);
      
      if (project?.id) {
        await storage.addBuildLog({
          projectId: project.id,
          level: "error",
          message: `Upload failed: ${error.message}`
        });
      }
      
      res.status(500).json({ 
        error: "Failed to upload file",
        code: "UPLOAD_FAILED",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get project details
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ error: "Failed to get project" });
    }
  });

  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  // Analyze project
  app.post("/api/projects/:id/analyze", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Update project status
      await storage.updateProject(projectId, {
        status: "analyzing",
        progress: 10,
      });

      await storage.addBuildLog({
        projectId,
        level: "info",
        message: "Starting project analysis...",
      });

      // Get project directory (files should already be extracted during upload)
      const projectDir = await fileManager.getProjectDirectory(projectId);

      // Analyze project
      const analysis = await projectAnalyzer.analyzeProject(projectDir);

      // Update project with analysis results
      await storage.updateProject(projectId, {
        framework: analysis.framework,
        status: analysis.hasValidStructure ? "analyzed" : "error",
        progress: 50,
        buildConfig: analysis.buildConfig,
        projectStats: analysis.projectStats,
      });

      await storage.addBuildLog({
        projectId,
        level: analysis.hasValidStructure ? "info" : "error",
        message: `Analysis complete. Framework: ${analysis.framework}`,
      });

      if (analysis.errors.length > 0) {
        for (const error of analysis.errors) {
          await storage.addBuildLog({
            projectId,
            level: "error",
            message: error,
          });
        }
      }

      // Update project with analysis JSON string
      await storage.updateProject(projectId, {
        analysis: JSON.stringify(analysis),
      });

      res.json({ analysis });
    } catch (error) {
      console.error("Analysis error:", error);
      await storage.updateProject(parseInt(req.params.id), {
        status: "error",
        progress: 0,
      });
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  // Phase 3: Project Setup - Comprehensive 4-step process
  app.post("/api/projects/:id/setup", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!project.analysis) {
        return res.status(400).json({ error: "Project must be analyzed first" });
      }

      const analysis = JSON.parse(project.analysis);

      // Update project status to setup
      await storage.updateProject(projectId, {
        status: "setup",
        progress: 25,
      });

      await storage.addBuildLog({
        projectId,
        level: "info",
        message: "Starting comprehensive project setup...",
      });

      const projectDir = await fileManager.getProjectDirectory(projectId);
      
      // ==== STEP 1: Install Dependencies ====
      await storage.addBuildLog({
        projectId,
        level: "info",
        message: "STEP 1/4: Installing project dependencies...",
      });

      await storage.updateProject(projectId, { progress: 30 });

      const dependencyResult = await apkBuilder.installDependencies(projectDir, analysis);
      
      // Add dependency installation logs
      for (const log of dependencyResult.logs) {
        await storage.addBuildLog({
          projectId,
          level: "info",
          message: log,
        });
      }

      for (const error of dependencyResult.errors) {
        await storage.addBuildLog({
          projectId,
          level: "error",
          message: error,
        });
      }

      if (!dependencyResult.success) {
        await storage.updateProject(projectId, {
          status: "error",
          progress: 30,
        });
        return res.status(500).json({ 
          error: "Dependency installation failed",
          details: dependencyResult.errors 
        });
      }

      // ==== STEP 2: Create Missing Files ====
      await storage.addBuildLog({
        projectId,
        level: "info",
        message: "STEP 2/4: Creating missing files and directories...",
      });

      await storage.updateProject(projectId, { progress: 40 });

      const missingFilesResult = await apkBuilder.detectAndCreateMissingFiles(projectDir, analysis);
      
      // Add missing files logs
      for (const log of missingFilesResult.logs) {
        await storage.addBuildLog({
          projectId,
          level: "info",
          message: log,
        });
      }

      for (const error of missingFilesResult.errors) {
        await storage.addBuildLog({
          projectId,
          level: "error",
          message: error,
        });
      }

      if (!missingFilesResult.success) {
        await storage.updateProject(projectId, {
          status: "error",
          progress: 40,
        });
        return res.status(500).json({ 
          error: "Missing files creation failed",
          details: missingFilesResult.errors 
        });
      }

      // ==== STEP 3: SDK Setup ====
      await storage.addBuildLog({
        projectId,
        level: "info",
        message: "STEP 3/4: Setting up required SDKs...",
      });

      await storage.updateProject(projectId, { progress: 50 });

      const sdkResult = await apkBuilder.setupSDKAndEnvironment(projectDir, analysis);
      
      // Add SDK setup logs
      for (const log of sdkResult.logs) {
        await storage.addBuildLog({
          projectId,
          level: "info",
          message: log,
        });
      }

      for (const error of sdkResult.errors) {
        await storage.addBuildLog({
          projectId,
          level: "error",
          message: error,
        });
      }

      if (!sdkResult.success) {
        await storage.updateProject(projectId, {
          status: "error",
          progress: 50,
        });
        return res.status(500).json({ 
          error: "SDK setup failed",
          details: sdkResult.errors 
        });
      }

      // ==== STEP 4: Build Tools Installation ====
      await storage.addBuildLog({
        projectId,
        level: "info",
        message: "STEP 4/4: Installing build tools...",
      });

      await storage.updateProject(projectId, { progress: 60 });

      const buildToolsResult = await apkBuilder.installBuildTools(projectDir, analysis);
      
      // Add build tools logs
      for (const log of buildToolsResult.logs) {
        await storage.addBuildLog({
          projectId,
          level: "info",
          message: log,
        });
      }

      for (const error of buildToolsResult.errors) {
        await storage.addBuildLog({
          projectId,
          level: "error",
          message: error,
        });
      }

      if (!buildToolsResult.success) {
        await storage.updateProject(projectId, {
          status: "error",
          progress: 60,
        });
        return res.status(500).json({ 
          error: "Build tools installation failed",
          details: buildToolsResult.errors 
        });
      }

      // ==== SETUP COMPLETE ====
      await storage.addBuildLog({
        projectId,
        level: "info",
        message: "✅ Project setup completed successfully! All dependencies installed, missing files created, SDKs configured, and build tools ready.",
      });

      await storage.updateProject(projectId, {
        status: "setup-complete",
        progress: 65,
      });

      res.json({ 
        success: true,
        message: "Project setup completed successfully",
        details: {
          dependencies: dependencyResult.success,
          missingFiles: missingFilesResult.success,
          sdkSetup: sdkResult.success,
          buildTools: buildToolsResult.success
        }
      });

    } catch (error) {
      console.error("Setup error:", error);
      await storage.updateProject(parseInt(req.params.id), {
        status: "error",
        progress: 0,
      });
      res.status(500).json({ error: "Setup failed" });
    }
  });

  // Build APK
  app.post("/api/projects/:id/build", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Update project status
      await storage.updateProject(projectId, {
        status: "building",
        progress: 60,
      });

      await storage.addBuildLog({
        projectId,
        level: "info",
        message: "Starting APK build...",
      });

      // Get project directory
      const projectDir = await fileManager.getProjectDirectory(projectId);
      
      // Re-analyze project to get latest analysis
      const analysis = await projectAnalyzer.analyzeProject(projectDir);

      // Build APK with progress callback
      const buildResult = await apkBuilder.buildApk(
        projectDir,
        analysis,
        async (progress, message) => {
          await storage.updateProject(projectId, { progress });
          await storage.addBuildLog({
            projectId,
            level: "info",
            message,
          });
        }
      );

      // Update project with build results
      if (buildResult.success) {
        await storage.updateProject(projectId, {
          status: "completed",
          progress: 100,
          apkPath: buildResult.apkPath,
          apkSize: buildResult.apkSize,
        });
      } else {
        await storage.updateProject(projectId, {
          status: "error",
          progress: 100,
        });
      }

      // Add build logs
      for (const log of buildResult.logs) {
        await storage.addBuildLog({
          projectId,
          level: "info",
          message: log,
        });
      }

      for (const error of buildResult.errors) {
        await storage.addBuildLog({
          projectId,
          level: "error",
          message: error,
        });
      }

      res.json({ buildResult });
    } catch (error) {
      console.error("Build error:", error);
      await storage.updateProject(parseInt(req.params.id), {
        status: "error",
        progress: 100,
      });
      res.status(500).json({ error: "Build failed" });
    }
  });

  // Download APK
  app.get("/api/projects/:id/download", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project || !project.apkPath) {
        return res.status(404).json({ error: "APK not found" });
      }

      const filename = `${project.name}-release.apk`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      
      res.sendFile(path.resolve(project.apkPath));
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Get build logs
  app.get("/api/projects/:id/logs", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const logs = await storage.getBuildLogs(projectId);
      res.json(logs);
    } catch (error) {
      console.error("Get logs error:", error);
      res.status(500).json({ error: "Failed to get logs" });
    }
  });

  // Clear build logs
  app.delete("/api/projects/:id/logs", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await storage.clearBuildLogs(projectId);
      res.json({ success: true });
    } catch (error) {
      console.error("Clear logs error:", error);
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Clean up files
      const projectDir = await fileManager.getProjectDirectory(projectId);
      await fileManager.deleteDirectory(projectDir);
      
      // Delete from storage
      await storage.clearBuildLogs(projectId);
      await storage.deleteProject(projectId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
