# Analysis Phase Workflow

## Overview
Deep analysis of project structure, framework detection, and dependency mapping.

## Steps
1. **Framework Detection**
   - Scan for configuration files (package.json, pubspec.yaml, build.gradle)
   - Identify programming language
   - Determine project type (native, hybrid, web)

2. **File Structure Analysis**
   - Count total files and directories
   - Identify source code files
   - Locate asset files
   - Find configuration files

3. **Dependency Analysis**
   - Parse dependency files
   - Identify required SDKs
   - Check for missing dependencies
   - Analyze build requirements

4. **Project Statistics**
   - Calculate project size
   - Count file types
   - Identify complex dependencies
   - Assess build complexity

## Supported Frameworks
- **React Native**: package.json + react-native dependencies
- **Flutter**: pubspec.yaml + Flutter SDK
- **Android**: build.gradle + Android SDK
- **Cordova**: config.xml + www directory

## Error Handling
- Unknown framework detection
- Missing required files
- Corrupted configuration files
- Unsupported project types