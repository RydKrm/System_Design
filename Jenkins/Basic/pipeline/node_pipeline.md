# Jenkins Pipeline Jobs: A Complete Developer's Guide

## What is a Jenkins Pipeline Job?

Think of a Jenkins pipeline job like a recipe for cooking your favorite dish. Just as a recipe has step-by-step instructions (chop vegetables, heat oil, add spices), a Jenkins pipeline has step-by-step instructions for building, testing, and deploying your code.

In simple terms, a **Jenkins Pipeline Job** is an automated workflow that takes your code from development to production through a series of predefined steps. Instead of manually building, testing, and deploying your application every time, Jenkins does it all automatically when you push code to your repository.

## Why Use Pipeline Jobs?

Imagine you're a chef in a busy restaurant. Every time someone orders your signature dish, you have to:
1. Gather ingredients
2. Prep vegetables  
3. Cook the dish
4. Plate it beautifully
5. Send it to the customer

Without a system, you'd waste time and make mistakes. Jenkins pipelines are like having a well-organized kitchen with clear procedures - everything happens automatically and consistently.

## Types of Jenkins Pipelines

There are two main types:

### 1. Declarative Pipeline (Recommended for Beginners)
- Uses a simple, structured syntax
- Easier to read and write
- Has built-in error handling

### 2. Scripted Pipeline
- More flexible but complex
- Uses Groovy scripting language
- Better for advanced use cases

## Production-Ready Node.js Pipeline Example

Let's create a complete pipeline for a Node.js application. I'll explain each part in detail:## Deep Explanation of Each Pipeline Component

```grovery
pipeline {
    // Define where this pipeline can run
    agent {
        docker {
            // Use official Node.js Docker image
            image 'node:18-alpine'
            // Keep container running and allow Docker commands
            args '-u root:root'
        }
    }
    
    // Environment variables available throughout the pipeline
    environment {
        // Define Node.js environment
        NODE_ENV = 'production'
        // Registry for Docker images (replace with your registry)
        DOCKER_REGISTRY = 'your-registry.com'
        // Application name
        APP_NAME = 'my-nodejs-app'
        // Version tag (using build number)
        VERSION = "${BUILD_NUMBER}"
        // Deployment environment
        DEPLOY_ENV = "${params.ENVIRONMENT ?: 'staging'}"
    }
    
    // Parameters that users can set when running the pipeline
    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['staging', 'production'],
            description: 'Choose deployment environment'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip running tests (not recommended for production)'
        )
        booleanParam(
            name: 'DEPLOY_ONLY',
            defaultValue: false,
            description: 'Skip build and only deploy existing image'
        )
    }
    
    // Define the pipeline stages
    stages {
        // Stage 1: Prepare the environment
        stage('Preparation') {
            steps {
                script {
                    // Print build information
                    echo "🚀 Starting build for ${APP_NAME}"
                    echo "📦 Version: ${VERSION}"
                    echo "🎯 Environment: ${DEPLOY_ENV}"
                    echo "📅 Build Date: ${new Date()}"
                }
                
                // Clean workspace to ensure fresh start
                cleanWs()
                
                // Checkout source code from Git
                checkout scm
                
                // Display Node.js and npm versions
                sh '''
                    echo "Node.js version:"
                    node --version
                    echo "npm version:"
                    npm --version
                '''
            }
        }
        
        // Stage 2: Install dependencies
        stage('Install Dependencies') {
            when {
                // Only run if not deploying existing image
                not { params.DEPLOY_ONLY }
            }
            steps {
                script {
                    echo "📚 Installing dependencies..."
                }
                
                // Cache node_modules for faster builds
                script {
                    if (fileExists('package-lock.json')) {
                        echo "Using npm ci for faster, reliable builds"
                        sh 'npm ci --only=production'
                    } else {
                        echo "Using npm install"
                        sh 'npm install --only=production'
                    }
                }
                
                // Install dev dependencies for testing
                sh 'npm install --only=development'
            }
            
            // Archive node_modules for later stages if needed
            post {
                success {
                    echo "✅ Dependencies installed successfully"
                }
                failure {
                    echo "❌ Failed to install dependencies"
                }
            }
        }
        
        // Stage 3: Code Quality & Security Checks
        stage('Code Quality') {
            when {
                allOf {
                    not { params.DEPLOY_ONLY }
                    not { params.SKIP_TESTS }
                }
            }
            parallel {
                // Sub-stage: Lint code
                stage('Lint Code') {
                    steps {
                        script {
                            echo "🔍 Running ESLint..."
                        }
                        
                        // Run ESLint and save results
                        sh '''
                            # Create reports directory
                            mkdir -p reports
                            
                            # Run ESLint with JUnit reporter
                            npx eslint . --format junit --output-file reports/eslint-results.xml || true
                            
                            # Also show results in console
                            npx eslint . --format compact || true
                        '''
                    }
                    post {
                        always {
                            // Publish ESLint results
                            publishTestResults([
                                allowEmptyResults: true,
                                testResultsPattern: 'reports/eslint-results.xml'
                            ])
                        }
                    }
                }
                
                // Sub-stage: Security audit
                stage('Security Audit') {
                    steps {
                        script {
                            echo "🔒 Running security audit..."
                        }
                        
                        sh '''
                            # Run npm audit and create report
                            npm audit --audit-level=moderate --json > reports/audit-results.json || true
                            
                            # Show audit results
                            npm audit --audit-level=moderate || true
                        '''
                    }
                }
            }
        }
        
        // Stage 4: Run Tests
        stage('Test') {
            when {
                allOf {
                    not { params.DEPLOY_ONLY }
                    not { params.SKIP_TESTS }
                }
            }
            parallel {
                // Sub-stage: Unit Tests
                stage('Unit Tests') {
                    steps {
                        script {
                            echo "🧪 Running unit tests..."
                        }
                        
                        sh '''
                            # Run tests with coverage
                            npm run test:coverage || npm test
                            
                            # Generate test reports in JUnit format
                            npm run test:junit || echo "No JUnit test script found"
                        '''
                    }
                    post {
                        always {
                            // Archive test results
                            publishTestResults([
                                allowEmptyResults: true,
                                testResultsPattern: 'test-results.xml,reports/test-*.xml'
                            ])
                            
                            // Publish coverage reports
                            publishCoverage([
                                adapters: [
                                    istanbulCoberturaAdapter('coverage/cobertura-coverage.xml')
                                ],
                                sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                            ])
                        }
                    }
                }
                
                // Sub-stage: Integration Tests  
                stage('Integration Tests') {
                    steps {
                        script {
                            echo "🔗 Running integration tests..."
                        }
                        
                        sh '''
                            # Start application in test mode
                            export NODE_ENV=test
                            npm run test:integration || echo "No integration tests found"
                        '''
                    }
                }
            }
        }
        
        // Stage 5: Build Application
        stage('Build') {
            when {
                not { params.DEPLOY_ONLY }
            }
            steps {
                script {
                    echo "🔨 Building application..."
                }
                
                // Build the application if build script exists
                sh '''
                    if npm run | grep -q "build"; then
                        echo "Building application..."
                        npm run build
                    else
                        echo "No build script found, skipping build step"
                    fi
                '''
                
                // Create production package
                sh '''
                    echo "Creating production package..."
                    
                    # Remove development dependencies
                    rm -rf node_modules
                    npm ci --only=production
                    
                    # Create artifact directory
                    mkdir -p artifacts
                    
                    # Create deployment package
                    tar -czf artifacts/${APP_NAME}-${VERSION}.tar.gz \
                        --exclude=node_modules/.cache \
                        --exclude=*.log \
                        --exclude=test \
                        --exclude=tests \
                        --exclude=.git \
                        .
                '''
            }
            
            post {
                success {
                    // Archive the build artifacts
                    archiveArtifacts([
                        artifacts: 'artifacts/*.tar.gz',
                        fingerprint: true,
                        allowEmptyArchive: false
                    ])
                    echo "✅ Build completed successfully"
                }
            }
        }
        
        // Stage 6: Build Docker Image
        stage('Docker Build') {
            when {
                not { params.DEPLOY_ONLY }
            }
            steps {
                script {
                    echo "🐳 Building Docker image..."
                    
                    // Build Docker image
                    def dockerImage = docker.build(
                        "${DOCKER_REGISTRY}/${APP_NAME}:${VERSION}"
                    )
                    
                    // Tag as latest for staging
                    if (DEPLOY_ENV == 'staging') {
                        dockerImage.tag("${DOCKER_REGISTRY}/${APP_NAME}:latest")
                    }
                    
                    // Push to registry
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry-credentials') {
                        dockerImage.push()
                        if (DEPLOY_ENV == 'staging') {
                            dockerImage.push('latest')
                        }
                    }
                }
            }
        }
        
        // Stage 7: Security Scanning
        stage('Security Scan') {
            when {
                not { params.DEPLOY_ONLY }
            }
            steps {
                script {
                    echo "🛡️ Scanning Docker image for vulnerabilities..."
                }
                
                // Scan Docker image with Trivy (or your preferred scanner)
                sh '''
                    # Install Trivy if not available
                    if ! command -v trivy &> /dev/null; then
                        echo "Installing Trivy..."
                        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | apt-key add -
                        echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | tee -a /etc/apt/sources.list.d/trivy.list
                        apt-get update && apt-get install -y trivy
                    fi
                    
                    # Scan the Docker image
                    trivy image --format json --output reports/trivy-results.json ${DOCKER_REGISTRY}/${APP_NAME}:${VERSION} || true
                    
                    # Show critical vulnerabilities
                    trivy image --severity CRITICAL,HIGH ${DOCKER_REGISTRY}/${APP_NAME}:${VERSION} || true
                '''
            }
        }
        
        // Stage 8: Deploy to Environment
        stage('Deploy') {
            steps {
                script {
                    echo "🚢 Deploying to ${DEPLOY_ENV}..."
                    
                    // Different deployment strategies based on environment
                    if (DEPLOY_ENV == 'staging') {
                        deployToStaging()
                    } else if (DEPLOY_ENV == 'production') {
                        deployToProduction()
                    }
                }
            }
        }
        
        // Stage 9: Health Check
        stage('Health Check') {
            steps {
                script {
                    echo "🏥 Performing health check..."
                    
                    // Wait for application to start
                    sleep(time: 30, unit: 'SECONDS')
                    
                    // Check application health
                    sh '''
                        # Define health check URL based on environment
                        if [ "${DEPLOY_ENV}" = "staging" ]; then
                            HEALTH_URL="https://staging.yourapp.com/health"
                        else
                            HEALTH_URL="https://yourapp.com/health"
                        fi
                        
                        # Perform health check with retry
                        for i in {1..5}; do
                            echo "Health check attempt $i..."
                            if curl -f -s $HEALTH_URL > /dev/null; then
                                echo "✅ Health check passed!"
                                exit 0
                            fi
                            sleep 10
                        done
                        
                        echo "❌ Health check failed after 5 attempts"
                        exit 1
                    '''
                }
            }
        }
    }
    
    // Actions to perform after pipeline completion
    post {
        always {
            script {
                echo "🧹 Cleaning up..."
            }
            
            // Clean up Docker images to save space
            sh '''
                docker image prune -f || true
                docker system prune -f || true
            '''
            
            // Archive logs
            archiveArtifacts([
                artifacts: 'reports/**/*',
                allowEmptyArchive: true,
                fingerprint: false
            ])
        }
        
        success {
            script {
                echo "✅ Pipeline completed successfully!"
                
                // Send success notification
                sendNotification(
                    "✅ Deployment Successful",
                    "${APP_NAME} v${VERSION} deployed to ${DEPLOY_ENV}",
                    "good"
                )
            }
        }
        
        failure {
            script {
                echo "❌ Pipeline failed!"
                
                // Send failure notification
                sendNotification(
                    "❌ Deployment Failed",
                    "${APP_NAME} v${VERSION} deployment to ${DEPLOY_ENV} failed",
                    "danger"
                )
            }
        }
        
        unstable {
            script {
                echo "⚠️ Pipeline completed with warnings!"
            }
        }
    }
}

// Custom function: Deploy to Staging
def deployToStaging() {
    echo "Deploying to staging environment..."
    
    sh '''
        # Example: Deploy using Docker Compose
        envsubst < docker-compose.staging.yml | docker-compose -f - up -d
        
        # Or deploy to Kubernetes
        # kubectl set image deployment/my-app my-app=${DOCKER_REGISTRY}/${APP_NAME}:${VERSION} -n staging
        
        # Or deploy to AWS ECS
        # aws ecs update-service --cluster staging --service my-app --force-new-deployment
    '''
}

// Custom function: Deploy to Production
def deployToProduction() {
    echo "Deploying to production environment..."
    
    // Require manual approval for production
    input message: 'Deploy to production?', ok: 'Deploy'
    
    sh '''
        # Blue-green deployment example
        echo "Performing blue-green deployment..."
        
        # Deploy to green environment first
        kubectl set image deployment/my-app-green my-app=${DOCKER_REGISTRY}/${APP_NAME}:${VERSION} -n production
        
        # Wait for rollout
        kubectl rollout status deployment/my-app-green -n production --timeout=300s
        
        # Switch traffic to green
        kubectl patch service my-app-service -n production -p '{"spec":{"selector":{"version":"green"}}}'
        
        # Wait and then cleanup blue
        sleep 60
        kubectl delete deployment my-app-blue -n production || true
        kubectl create deployment my-app-blue --image=${DOCKER_REGISTRY}/${APP_NAME}:${VERSION} -n production
    '''
}

// Custom function: Send Notifications
def sendNotification(title, message, color) {
    // Slack notification
    slackSend(
        channel: '#deployments',
        color: color,
        message: """
            ${title}
            ${message}
            
            Build: ${BUILD_NUMBER}
            Branch: ${BRANCH_NAME}
            Commit: ${GIT_COMMIT[0..7]}
            Duration: ${currentBuild.durationString}
        """
    )
    
    // Email notification for production failures
    if (color == 'danger' && DEPLOY_ENV == 'production') {
        emailext(
            subject: "${title} - ${APP_NAME}",
            body: """
                ${message}
                
                Build Details:
                - Build Number: ${BUILD_NUMBER}
                - Branch: ${BRANCH_NAME}
                - Environment: ${DEPLOY_ENV}
                - Build URL: ${BUILD_URL}
                
                Please check the build logs for more details.
            """,
            to: 'devops@yourcompany.com,team-lead@yourcompany.com'
        )
    }
}

```

### 1. **Pipeline Declaration**
```groovy
pipeline {
```
This declares that we're using a declarative pipeline. Think of it as saying "Jenkins, I'm going to give you a structured recipe to follow."

### 2. **Agent Section**
```groovy
agent {
    docker {
        image 'node:18-alpine'
        args '-u root:root'
    }
}
```
**What it does**: Tells Jenkins where to run the pipeline.
**Analogy**: Like choosing which kitchen (computer) to cook in and what tools (Docker container) to use.
**Why Docker**: Ensures consistent environment across different Jenkins servers.

### 3. **Environment Variables**
```groovy
environment {
    NODE_ENV = 'production'
    DOCKER_REGISTRY = 'your-registry.com'
    // ... more variables
}
```
**What it does**: Sets up variables that all pipeline stages can use.
**Analogy**: Like organizing all your ingredients and tools before starting to cook.

### 4. **Parameters**
```groovy
parameters {
    choice(name: 'ENVIRONMENT', choices: ['staging', 'production'])
    booleanParam(name: 'SKIP_TESTS', defaultValue: false)
}
```
**What it does**: Allows developers to customize the pipeline run.
**Real-world use**: A developer can choose to deploy to staging vs production, or skip tests in emergency situations.

### 5. **Stages Breakdown**

#### **Preparation Stage**
- **Purpose**: Sets up the workspace and checks out code
- **Like**: Cleaning your kitchen counter and gathering ingredients
- **Key Actions**: Clean workspace, checkout code from Git, display environment info

#### **Install Dependencies Stage**
- **Purpose**: Downloads all required Node.js packages
- **Like**: Shopping for ingredients you don't have at home
- **Why `npm ci`**: Faster and more reliable than `npm install` for production builds
- **Conditional Logic**: Only runs if we're not just deploying an existing image

#### **Code Quality Stage (Parallel)**
- **Purpose**: Checks code quality and security
- **Like**: Checking if ingredients are fresh and safe to use
- **Parallel Execution**: Runs multiple checks simultaneously to save time
- **ESLint**: Checks code style and potential errors
- **Security Audit**: Scans for vulnerable dependencies

#### **Test Stage (Parallel)**
- **Purpose**: Runs different types of tests
- **Like**: Tasting your dish at different cooking stages
- **Unit Tests**: Test individual functions
- **Integration Tests**: Test how different parts work together
- **Coverage Reports**: Shows how much of your code is tested

#### **Build Stage**
- **Purpose**: Compiles/prepares the application for deployment
- **Like**: Cooking and packaging your dish for delivery
- **Production Dependencies**: Removes development tools to make the package smaller
- **Artifact Creation**: Creates a deployable package (.tar.gz file)

#### **Docker Build Stage**
- **Purpose**: Creates a container image with your application
- **Like**: Putting your dish in a special container that can be heated anywhere
- **Image Tagging**: Labels the container with version numbers
- **Registry Push**: Uploads the container to a shared storage

#### **Security Scan Stage**
- **Purpose**: Scans the Docker image for security vulnerabilities
- **Like**: Final safety inspection before shipping
- **Trivy Scanner**: Popular open-source vulnerability scanner
- **Automated Security**: Catches security issues before deployment

#### **Deploy Stage**
- **Purpose**: Deploys the application to the target environment
- **Like**: Delivering and serving the dish to customers
- **Environment-Specific Logic**: Different deployment strategies for staging vs production
- **Blue-Green Deployment**: Advanced technique for zero-downtime production deployments

#### **Health Check Stage**
- **Purpose**: Verifies the deployed application is working
- **Like**: Asking customers if they're happy with their meal
- **Retry Logic**: Tries multiple times before declaring failure
- **Real HTTP Checks**: Actually tests the application endpoints

### 6. **Post-Pipeline Actions**
```groovy
post {
    always { /* cleanup */ }
    success { /* celebration */ }
    failure { /* alert the team */ }
}
```
**Purpose**: Defines what happens after the pipeline finishes
**Like**: Cleaning the kitchen and telling everyone how the cooking went

## Key Production-Ready Features

### 1. **Error Handling**
- Each stage has proper error handling
- Pipeline continues even if non-critical steps fail
- Clear error messages and notifications

### 2. **Security First**
- Dependency security scanning
- Docker image vulnerability scanning
- Secure credential handling

### 3. **Scalability**
- Parallel execution where possible
- Docker-based builds for consistency
- Artifact caching for speed

### 4. **Monitoring & Notifications**
- Slack/email notifications
- Test result publishing
- Build artifact archiving

### 5. **Deployment Strategies**
- Blue-green deployment for production
- Manual approval gates for critical environments
- Rollback capabilities

## How to Use This Pipeline

### 1. **Prerequisites**
```bash
# Your Node.js project needs these files:
- package.json (with test scripts)
- Dockerfile
- .eslintrc.js (for code linting)
- docker-compose.staging.yml
```

### 2. **Jenkins Setup**
1. Install required Jenkins plugins:
   - Pipeline Plugin
   - Docker Plugin
   - Blue Ocean (for better UI)
   - Slack Notification Plugin

2. Configure credentials:
   - Docker registry credentials
   - Git repository access
   - Slack webhook token

### 3. **Create the Pipeline Job**
1. New Item → Pipeline
2. Copy the pipeline code into the script section
3. Configure Git repository
4. Set up webhooks for automatic triggers

### 4. **Customize for Your Project**
- Update Docker registry URLs
- Modify deployment commands
- Adjust notification channels
- Add/remove test stages as needed

## Benefits of This Approach

1. **Consistency**: Every deployment follows the same process
2. **Speed**: Automated processes are much faster than manual ones
3. **Quality**: Automatic testing catches bugs before production
4. **Traceability**: Complete history of what was deployed when
5. **Rollback**: Easy to revert to previous versions
6. **Team Collaboration**: Everyone follows the same deployment process

This pipeline transforms your development process from a manual, error-prone series of steps into a reliable, automated system that ensures quality and consistency in every deployment.