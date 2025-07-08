import path from 'path';
import { FileManager } from './fileManager';

export interface ProjectAnalysis {
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
    gradleVersion?: string;
    kotlinVersion?: string;
    javaVersion?: string;
    flutterVersion?: string;
    dartVersion?: string;
    reactNativeVersion?: string;
    nodeVersion?: string;
    buildVariants?: string[];
    applicationId?: string;
    versionCode?: number;
    versionName?: string;
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

export class ProjectAnalyzer {
  private fileManager: FileManager;

  constructor(fileManager: FileManager) {
    this.fileManager = fileManager;
  }

  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    const analysis: ProjectAnalysis = {
      framework: 'unknown',
      language: 'unknown',
      projectType: 'unknown',
      hasValidStructure: false,
      missingFiles: [],
      dependencies: [],
      devDependencies: [],
      buildConfig: {},
      projectStats: {
        totalFiles: 0,
        sourceFiles: 0,
        testFiles: 0,
        assetFiles: 0,
        configFiles: 0,
        dependencies: 0,
        devDependencies: 0,
      },
      sourceStructure: {},
      errors: [],
      warnings: [],
    };

    try {
      // Get all files in the project
      const allFiles = await this.getAllFiles(projectPath);
      analysis.projectStats.totalFiles = allFiles.length;

      // Detect framework based on files
      const frameworkDetection = this.detectFramework(allFiles);
      analysis.framework = frameworkDetection.framework;
      analysis.language = frameworkDetection.language;
      analysis.projectType = frameworkDetection.projectType;

      // Count different file types
      this.analyzeFileTypes(allFiles, analysis);

      // Analyze based on detected framework
      switch (analysis.framework) {
        case 'react-native':
          await this.analyzeReactNative(projectPath, allFiles, analysis);
          break;
        case 'flutter':
          await this.analyzeFlutter(projectPath, allFiles, analysis);
          break;
        case 'android':
          await this.analyzeAndroid(projectPath, allFiles, analysis);
          break;
        case 'cordova':
          await this.analyzeCordova(projectPath, allFiles, analysis);
          break;
        default:
          analysis.framework = 'generic-mobile';
          analysis.warnings.push('Framework not automatically detected - will use generic mobile project setup');
      }

      // Calculate estimated build time and project size
      this.calculateProjectMetrics(analysis);

      analysis.hasValidStructure = analysis.errors.length === 0;
    } catch (error) {
      analysis.errors.push(`Analysis failed: ${error.message}`);
    }

    return analysis;
  }

  private async getAllFiles(directory: string, relativePath = ''): Promise<string[]> {
    const files: string[] = [];
    try {
      const currentDir = path.join(directory, relativePath);
      
      // Get both files and directories
      const fileEntries = await this.fileManager.listFiles(currentDir);
      const dirEntries = await this.fileManager.listDirectories(currentDir);
      
      // Add all files
      for (const file of fileEntries) {
        files.push(path.join(relativePath, file).replace(/\\/g, '/'));
      }
      
      // Recursively process directories (but limit depth to avoid infinite loops)
      if (relativePath.split('/').length < 10) { // Max depth 10
        for (const dir of dirEntries) {
          if (!dir.startsWith('.') && dir !== 'node_modules' && dir !== '.git') {
            const subFiles = await this.getAllFiles(directory, path.join(relativePath, dir));
            files.push(...subFiles);
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }

    return files;
  }

  private detectFramework(files: string[]): { framework: string; language: string; projectType: string } {
    // React Native detection
    if (files.some(f => f.includes('package.json'))) {
      const hasReactNative = files.some(f => f.includes('react-native') || f.includes('metro.config'));
      if (hasReactNative) {
        return { framework: 'react-native', language: 'javascript', projectType: 'hybrid' };
      }
    }

    // Flutter detection
    if (files.some(f => f.includes('pubspec.yaml'))) {
      return { framework: 'flutter', language: 'dart', projectType: 'hybrid' };
    }

    // Android native detection
    if (files.some(f => f.includes('build.gradle') || f.includes('AndroidManifest.xml'))) {
      const hasKotlin = files.some(f => f.endsWith('.kt'));
      const hasJava = files.some(f => f.endsWith('.java'));
      const language = hasKotlin ? 'kotlin' : hasJava ? 'java' : 'unknown';
      return { framework: 'android', language, projectType: 'native' };
    }

    // Cordova detection
    if (files.some(f => f.includes('config.xml') && f.includes('www'))) {
      return { framework: 'cordova', language: 'javascript', projectType: 'hybrid' };
    }

    return { framework: 'unknown', language: 'unknown', projectType: 'unknown' };
  }

  private analyzeFileTypes(files: string[], analysis: ProjectAnalysis): void {
    const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx', '.dart', '.java', '.kt', '.swift', '.m', '.h'];
    const testExtensions = ['.test.js', '.test.ts', '.spec.js', '.spec.ts', '_test.dart'];
    const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.ttf', '.otf', '.woff', '.woff2'];
    const configExtensions = ['.json', '.yaml', '.yml', '.xml', '.gradle', '.properties', '.plist'];

    files.forEach(file => {
      const lowerFile = file.toLowerCase();
      
      if (testExtensions.some(ext => lowerFile.includes(ext))) {
        analysis.projectStats.testFiles++;
      } else if (sourceExtensions.some(ext => lowerFile.endsWith(ext))) {
        analysis.projectStats.sourceFiles++;
      } else if (assetExtensions.some(ext => lowerFile.endsWith(ext))) {
        analysis.projectStats.assetFiles++;
      } else if (configExtensions.some(ext => lowerFile.endsWith(ext))) {
        analysis.projectStats.configFiles++;
      }
    });
  }

  private calculateProjectMetrics(analysis: ProjectAnalysis): void {
    const totalFiles = analysis.projectStats.totalFiles;
    const sourceFiles = analysis.projectStats.sourceFiles;
    
    // Estimate build time based on project size and complexity
    let estimatedMinutes = 2; // Base time
    if (sourceFiles > 100) estimatedMinutes += 2;
    if (sourceFiles > 500) estimatedMinutes += 3;
    if (analysis.dependencies.length > 50) estimatedMinutes += 2;
    if (analysis.framework === 'flutter') estimatedMinutes += 1;
    if (analysis.framework === 'react-native') estimatedMinutes += 2;
    
    analysis.projectStats.estimatedBuildTime = `${estimatedMinutes}-${estimatedMinutes + 2} minutes`;
    
    // Estimate project size
    if (totalFiles < 50) {
      analysis.projectStats.projectSize = 'Small';
    } else if (totalFiles < 200) {
      analysis.projectStats.projectSize = 'Medium';
    } else {
      analysis.projectStats.projectSize = 'Large';
    }
  }

  private async analyzeReactNative(projectPath: string, files: string[], analysis: ProjectAnalysis): Promise<void> {
    analysis.framework = 'react-native';
    analysis.language = 'javascript';
    analysis.projectType = 'mobile';

    const packageJsonFile = files.find(f => f.includes('package.json') && !f.includes('node_modules'));
    
    if (!packageJsonFile) {
      analysis.missingFiles.push('package.json');
      analysis.errors.push('Missing package.json file - required for React Native projects');
      return;
    }

    try {
      const packageJsonPath = path.join(projectPath, packageJsonFile);
      const packageJsonContent = await this.fileManager.readFile(packageJsonPath);
      const packageJson = JSON.parse(packageJsonContent);
      
      // Extract project information
      analysis.projectName = packageJson.name || 'react-native-app';
      analysis.buildConfig.versionName = packageJson.version || '1.0.0';
      analysis.packageName = `com.reactnative.${analysis.projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      
      // Extract dependencies
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});
      
      analysis.dependencies = dependencies;
      analysis.devDependencies = devDependencies;
      analysis.projectStats.dependencies = dependencies.length;
      analysis.projectStats.devDependencies = devDependencies.length;
      
      // Extract React Native version
      if (packageJson.dependencies && packageJson.dependencies['react-native']) {
        analysis.buildConfig.reactNativeVersion = packageJson.dependencies['react-native'];
        analysis.frameworkVersion = packageJson.dependencies['react-native'];
      }

      // Extract Node.js version requirement
      if (packageJson.engines && packageJson.engines.node) {
        analysis.buildConfig.nodeVersion = packageJson.engines.node;
      }
      
    } catch (error) {
      analysis.errors.push(`Failed to analyze package.json: ${error.message}`);
    }

    // Analyze Android build configuration
    const buildGradleFile = files.find(f => f.includes('android/app/build.gradle'));
    if (buildGradleFile) {
      try {
        const buildGradlePath = path.join(projectPath, buildGradleFile);
        const buildGradleContent = await this.fileManager.readFile(buildGradlePath);
        
        // Extract SDK versions
        const targetSdk = this.extractGradleValue(buildGradleContent, 'targetSdkVersion');
        const minSdk = this.extractGradleValue(buildGradleContent, 'minSdkVersion');
        const compileSdk = this.extractGradleValue(buildGradleContent, 'compileSdkVersion');
        
        analysis.buildConfig.targetSdk = targetSdk || 33;
        analysis.buildConfig.minSdk = minSdk || 21;
        analysis.buildConfig.compileSdk = compileSdk || 33;
        
        // Extract application ID
        const appIdMatch = buildGradleContent.match(/applicationId\s+"([^"]+)"/);
        if (appIdMatch) {
          analysis.packageName = appIdMatch[1];
          analysis.buildConfig.applicationId = appIdMatch[1];
        }
        
        // Extract version info
        const versionCodeMatch = buildGradleContent.match(/versionCode\s+(\d+)/);
        const versionNameMatch = buildGradleContent.match(/versionName\s+"([^"]+)"/);
        
        if (versionCodeMatch) {
          analysis.buildConfig.versionCode = parseInt(versionCodeMatch[1]);
        }
        
        if (versionNameMatch) {
          analysis.buildConfig.versionName = versionNameMatch[1];
        }
        
      } catch (error) {
        analysis.warnings.push(`Failed to parse Android build.gradle: ${error.message}`);
      }
    }

    // Set comprehensive build configuration
    analysis.buildConfig = {
      targetSdk: analysis.buildConfig.targetSdk || 33,
      minSdk: analysis.buildConfig.minSdk || 21,
      compileSdk: analysis.buildConfig.compileSdk || 33,
      buildTools: 'React Native CLI',
      reactNativeVersion: analysis.buildConfig.reactNativeVersion || 'latest',
      nodeVersion: analysis.buildConfig.nodeVersion || '>=16.0.0',
      buildVariants: ['debug', 'release'],
      applicationId: analysis.buildConfig.applicationId || analysis.packageName,
      versionName: analysis.buildConfig.versionName || '1.0.0',
      versionCode: analysis.buildConfig.versionCode || 1,
      ...analysis.buildConfig
    };

    // Check for essential React Native files
    const requiredFiles = ['package.json', 'App.js', 'App.tsx', 'index.js'];
    const androidFiles = ['android/app/build.gradle', 'android/build.gradle'];
    const iosFiles = ['ios/Podfile', 'ios/*.xcodeproj'];
    
    // Check for at least one app entry point
    const hasAppEntry = requiredFiles.some(file => files.some(f => f.includes(file)));
    if (!hasAppEntry) {
      analysis.missingFiles.push('App.js or App.tsx (main component)');
    }
    
    // Check platform-specific files
    const hasAndroid = androidFiles.some(file => files.some(f => f.includes(file.replace('*', ''))));
    const hasIOS = iosFiles.some(file => files.some(f => f.includes(file.replace('*', ''))));
    
    if (!hasAndroid) {
      analysis.warnings.push('Android platform files missing - APK build may require additional setup');
    }
    
    if (!hasIOS) {
      analysis.warnings.push('iOS platform files missing - iOS build not supported');
    }

    // Analyze source structure
    analysis.sourceStructure = {
      mainSource: files.filter(f => 
        (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.tsx')) &&
        !f.includes('node_modules') && !f.includes('test')
      ),
      testSource: files.filter(f => 
        f.includes('test') || f.includes('spec') || f.includes('__tests__')
      ),
      assets: files.filter(f => 
        f.includes('assets/') || 
        f.includes('images/') || 
        f.endsWith('.png') || 
        f.endsWith('.jpg') || 
        f.endsWith('.ttf')
      ),
      resources: files.filter(f => 
        f.includes('android/app/src/main/res/') || 
        f.includes('ios/') && (f.includes('Assets.xcassets') || f.includes('Info.plist'))
      )
    };

    analysis.hasValidStructure = analysis.missingFiles.length === 0;
  }

  private async analyzeFlutter(projectPath: string, files: string[], analysis: ProjectAnalysis): Promise<void> {
    analysis.framework = 'flutter';
    analysis.language = 'dart';
    analysis.projectType = 'mobile';

    const pubspecFile = files.find(f => f.includes('pubspec.yaml') || f.includes('pubspec.yml'));
    
    if (!pubspecFile) {
      analysis.missingFiles.push('pubspec.yaml');
      analysis.errors.push('Missing pubspec.yaml file - required for Flutter projects');
      return;
    }

    try {
      const pubspecPath = path.join(projectPath, pubspecFile);
      const pubspecContent = await this.fileManager.readFile(pubspecPath);
      
      // Extract project name
      const nameMatch = pubspecContent.match(/^name:\s*(.+)$/m);
      if (nameMatch) {
        analysis.projectName = nameMatch[1].trim();
      }

      // Extract version
      const versionMatch = pubspecContent.match(/^version:\s*(.+)$/m);
      if (versionMatch) {
        const versionParts = versionMatch[1].trim().split('+');
        analysis.buildConfig.versionName = versionParts[0];
        analysis.buildConfig.versionCode = versionParts[1] ? parseInt(versionParts[1]) : 1;
      }

      // Extract Flutter version constraint
      const environmentSection = pubspecContent.match(/environment:([\s\S]*?)(?=\n\w|$)/);
      if (environmentSection) {
        const flutterMatch = environmentSection[1].match(/flutter:\s*["']?([^"'\n]+)["']?/);
        if (flutterMatch) {
          analysis.buildConfig.flutterVersion = flutterMatch[1].trim();
          analysis.frameworkVersion = flutterMatch[1].trim();
        }
      }

      // Extract dependencies
      const dependencySection = pubspecContent.match(/^dependencies:([\s\S]*?)(?=^[a-zA-Z]|\ndev_dependencies:|\n$)/m);
      if (dependencySection) {
        const deps = dependencySection[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#') && line.includes(':') && !line.startsWith('sdk:'))
          .map(line => {
            const [name] = line.split(':').map(s => s.trim());
            return name;
          })
          .filter(name => name && name !== 'flutter');
        
        analysis.dependencies = deps;
        analysis.projectStats.dependencies = deps.length;
      }

      // Extract dev dependencies
      const devDependencySection = pubspecContent.match(/^dev_dependencies:([\s\S]*?)(?=^[a-zA-Z]|\n$)/m);
      if (devDependencySection) {
        const devDeps = devDependencySection[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#') && line.includes(':'))
          .map(line => {
            const [name] = line.split(':').map(s => s.trim());
            return name;
          })
          .filter(name => name && name !== 'flutter_test');
        
        analysis.devDependencies = devDeps;
        analysis.projectStats.devDependencies = devDeps.length;
      }

      // Set comprehensive build configuration for Flutter
      analysis.buildConfig = {
        targetSdk: 34,
        minSdk: 21,
        compileSdk: 34,
        buildTools: 'Flutter SDK',
        flutterVersion: analysis.buildConfig.flutterVersion || '>=3.0.0',
        dartVersion: '>=3.0.0 <4.0.0',
        buildVariants: ['debug', 'profile', 'release'],
        applicationId: `com.example.${analysis.projectName || 'app'}`,
        versionName: analysis.buildConfig.versionName || '1.0.0',
        versionCode: analysis.buildConfig.versionCode || 1,
        ...analysis.buildConfig
      };
      
    } catch (error) {
      analysis.errors.push(`Failed to analyze pubspec.yaml: ${error.message}`);
    }

    // Check for essential Flutter files and structure
    const requiredFiles = ['lib/main.dart', 'pubspec.yaml'];
    const recommendedFiles = ['android/app/build.gradle', 'ios/Runner.xcodeproj/project.pbxproj', 'test/'];
    
    analysis.missingFiles = requiredFiles.filter(file => !files.some(f => f.includes(file)));
    
    // Check for recommended files as warnings
    recommendedFiles.forEach(file => {
      if (!files.some(f => f.includes(file))) {
        analysis.warnings.push(`Recommended file/directory missing: ${file}`);
      }
    });

    // Analyze source structure
    analysis.sourceStructure = {
      mainSource: files.filter(f => f.includes('lib/') && f.endsWith('.dart')),
      testSource: files.filter(f => f.includes('test/') && f.endsWith('.dart')),
      assets: files.filter(f => 
        f.includes('assets/') || 
        f.includes('images/') || 
        f.includes('fonts/') ||
        f.endsWith('.png') || 
        f.endsWith('.jpg') || 
        f.endsWith('.ttf')
      ),
      resources: files.filter(f => 
        f.includes('android/app/src/main/res/') || 
        f.includes('ios/Runner/Assets.xcassets/')
      )
    };

    // Determine package name from android manifest if available
    const androidManifest = files.find(f => f.includes('android/app/src/main/AndroidManifest.xml'));
    if (androidManifest) {
      try {
        const manifestPath = path.join(projectPath, androidManifest);
        const manifestContent = await this.fileManager.readFile(manifestPath);
        const packageMatch = manifestContent.match(/package="([^"]+)"/);
        if (packageMatch) {
          analysis.packageName = packageMatch[1];
          analysis.buildConfig.applicationId = packageMatch[1];
        }
      } catch (error) {
        // Ignore manifest read errors
      }
    }

    analysis.hasValidStructure = analysis.missingFiles.length === 0;
  }

  private async analyzeAndroid(projectPath: string, files: string[], analysis: ProjectAnalysis): Promise<void> {
    // Initialize build config with default flags
    analysis.buildConfig = {
      hasBuildGradle: false,
      hasManifest: false,
      targetSdk: 33,
      minSdk: 21
    };

    // Check for essential files
    const requiredFiles = ['build.gradle', 'app/build.gradle', 'app/src/main/AndroidManifest.xml'];
    analysis.missingFiles = requiredFiles.filter(file => !files.some(f => f.includes(file)));

    // Parse build.gradle
    const appGradlePath = path.join(projectPath, 'app/build.gradle');
    if (await this.fileManager.fileExists(appGradlePath)) {
      analysis.buildConfig.hasBuildGradle = true;
      try {
        const gradleContent = await this.fileManager.readFile(appGradlePath);
        const targetSdk = this.extractGradleValue(gradleContent, 'targetSdkVersion');
        const minSdk = this.extractGradleValue(gradleContent, 'minSdkVersion');
        
        analysis.projectStats.targetSdk = targetSdk || 33;
        analysis.projectStats.minSdk = minSdk || 21;
        analysis.buildConfig.targetSdk = analysis.projectStats.targetSdk;
        analysis.buildConfig.minSdk = analysis.projectStats.minSdk;
      } catch (error) {
        analysis.errors.push('Failed to parse build.gradle');
      }
    }

    // Check for AndroidManifest.xml
    const manifestPath = path.join(projectPath, 'app/src/main/AndroidManifest.xml');
    if (await this.fileManager.fileExists(manifestPath)) {
      analysis.buildConfig.hasManifest = true;
    }

    analysis.projectStats.sourceFiles = files.filter(f => f.endsWith('.java') || f.endsWith('.kt')).length;
  }

  private async analyzeCordova(projectPath: string, files: string[], analysis: ProjectAnalysis): Promise<void> {
    // Initialize build config with default flags
    analysis.buildConfig = {
      hasConfigXml: false,
      hasWwwFolder: false,
      appName: 'Mobile App',
      version: '1.0.0'
    };

    // Check for essential files
    const requiredFiles = ['config.xml', 'www/index.html'];
    analysis.missingFiles = requiredFiles.filter(file => !files.some(f => f.includes(file)));

    // Parse config.xml
    const configPath = path.join(projectPath, 'config.xml');
    if (await this.fileManager.fileExists(configPath)) {
      analysis.buildConfig.hasConfigXml = true;
      try {
        const configContent = await this.fileManager.readFile(configPath);
        // Extract app info from config.xml
        const nameMatch = configContent.match(/<name>(.*?)<\/name>/);
        const versionMatch = configContent.match(/version="(.*?)"/);
        
        analysis.buildConfig.appName = nameMatch ? nameMatch[1] : 'Mobile App';
        analysis.buildConfig.version = versionMatch ? versionMatch[1] : '1.0.0';
      } catch (error) {
        analysis.errors.push('Failed to parse config.xml');
      }
    }

    // Check for www folder
    const wwwPath = path.join(projectPath, 'www');
    if (await this.fileManager.fileExists(wwwPath)) {
      analysis.buildConfig.hasWwwFolder = true;
    }

    analysis.projectStats.sourceFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.css')).length;
  }

  private extractGradleValue(content: string, key: string): number | undefined {
    const regex = new RegExp(`${key}\\s+(\\d+)`);
    const match = content.match(regex);
    return match ? parseInt(match[1]) : undefined;
  }
}
