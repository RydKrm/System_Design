# The Complete Guide to Jenkins Job Structures: From Beginner to Expert

## Table of Contents
1. [Understanding Jenkins Jobs: The Foundation](#understanding-jenkins-jobs)
2. [The Anatomy of a Jenkins Job](#anatomy-of-jenkins-job)
3. [Types of Jenkins Jobs and Their Structures](#types-of-jenkins-jobs)
4. [Deep Dive: How Jenkins Jobs Actually Work](#how-jenkins-jobs-work)
5. [Job Configuration Structure](#job-configuration-structure)
6. [Advanced Job Patterns](#advanced-job-patterns)
7. [Real-World Examples](#real-world-examples)

---

## Understanding Jenkins Jobs: The Foundation {#understanding-jenkins-jobs}

### What is a Jenkins Job?

Think of a Jenkins job as a **recipe** for your computer. Just like a cooking recipe tells you what ingredients to use and what steps to follow to make a dish, a Jenkins job tells the computer what code to use and what steps to follow to build, test, or deploy your application.

**Real-World Analogy:**
Imagine you run a bakery. Every morning, you need to:
1. Check if new flour arrived (check for code changes)
2. Mix the ingredients (build the code)
3. Bake the bread (run tests)
4. Package it (create deployable artifacts)
5. Deliver to stores (deploy to servers)

A Jenkins job automates this entire process for software development.

### Why Do We Need Jenkins Jobs?

#### Problem 1: Human Error
```
Developer A: "I forgot to run tests before deploying"
Result: Production breaks, customers can't use the website
Cost: $10,000 in lost revenue + developer time to fix
```

#### Problem 2: Inconsistency
```
Developer B's machine: Works perfectly
Staging server: Fails due to different environment
Production server: Different failure due to different configuration
```

#### Problem 3: Time Waste
```
Manual deployment process: 2 hours per release
Automated deployment: 10 minutes per release
Weekly releases: Saves 7.5 hours of developer time
```

---

## The Anatomy of a Jenkins Job {#anatomy-of-jenkins-job}

Every Jenkins job has the following structure:

```
Jenkins Job
├── Job Configuration (What to do)
│   ├── Source Code Management (Where to get code)
│   ├── Build Triggers (When to start)
│   ├── Build Environment (How to prepare)
│   ├── Build Steps (What to execute)
│   └── Post-Build Actions (What to do after)
├── Workspace (Where work happens)
├── Build History (Records of past runs)
└── Job Metadata (Job information)
```

### 1. Job Configuration: The Blueprint

This is like the instruction manual for your job. It contains:

**Source Code Management (SCM)**
- Where is your code stored? (GitHub, GitLab, Bitbucket)
- Which branch should we use? (main, develop, feature-branch)
- What credentials are needed?

**Build Triggers**
- When should this job run?
- Automatically when code changes?
- At scheduled times?
- When another job completes?

**Build Environment**
- What tools are needed? (Java, Python, Node.js)
- What environment variables to set?
- Should we clean the workspace first?

**Build Steps**
- The actual commands to execute
- Scripts to run
- Tools to invoke

**Post-Build Actions**
- Send notifications
- Archive files
- Trigger other jobs
- Deploy applications

### 2. Workspace: The Work Area

Think of the workspace as a dedicated folder on the Jenkins server where your job does its work. Each job gets its own workspace.

```
Workspace Structure:
/var/jenkins_home/workspace/my-web-app/
├── src/                    (Your source code)
├── node_modules/           (Dependencies)
├── build/                  (Built files)
├── test-results/           (Test outputs)
└── artifacts/              (Final products)
```

### 3. Build History: The Memory

Jenkins keeps track of every time your job runs:

```
Build #47 - SUCCESS - 2 minutes ago
Build #46 - FAILURE - 1 hour ago  
Build #45 - SUCCESS - 3 hours ago
Build #44 - SUCCESS - 5 hours ago
```

Each build record includes:
- Start/end time
- Success/failure status
- Console output (logs)
- Test results
- Artifacts produced

---

## Types of Jenkins Jobs and Their Structures {#types-of-jenkins-jobs}

### 1. Freestyle Jobs: The Swiss Army Knife

**Structure:**
```
Freestyle Job
├── General Settings
│   ├── Job Name
│   ├── Description
│   ├── Parameters (optional)
│   └── Properties
├── Source Code Management
│   ├── Repository URL
│   ├── Credentials
│   ├── Branches to build
│   └── Repository browser
├── Build Triggers
│   ├── Poll SCM
│   ├── Build after other projects
│   ├── Build periodically
│   └── GitHub hook trigger
├── Build Environment
│   ├── Delete workspace before build
│   ├── Use secret text(s) or file(s)
│   ├── Add timestamps to Console Output
│   └── Set up environment variables
├── Build Steps (Sequential)
│   ├── Execute shell/batch command
│   ├── Invoke Ant/Maven/Gradle
│   ├── Execute Windows batch command
│   └── Send files or execute commands over SSH
└── Post-build Actions
    ├── Archive artifacts
    ├── Publish test results
    ├── Send notifications
    └── Trigger other jobs
```

**Example: E-commerce Website Build Job**

```yaml
Job Name: "ecommerce-frontend-build"
Description: "Builds and tests our React e-commerce frontend"

Source Code Management:
  Repository: https://github.com/company/ecommerce-frontend.git
  Branch: */main
  Credentials: github-access-token

Build Triggers:
  - GitHub hook trigger for GITScm polling
  - Poll SCM: H/5 * * * * (every 5 minutes)

Build Environment:
  - Delete workspace before build starts
  - Provide Node & npm bin/ folder to PATH

Build Steps:
  1. Execute shell:
     ```bash
     echo "Installing dependencies..."
     npm install
     ```
  
  2. Execute shell:
     ```bash
     echo "Running tests..."
     npm test
     ```
  
  3. Execute shell:
     ```bash
     echo "Building application..."
     npm run build
     ```

Post-build Actions:
  - Archive artifacts: build/**
  - Publish JUnit test results: test-results.xml
  - Email notification to: dev-team@company.com
```

### 2. Pipeline Jobs: The Professional Assembly Line

Pipeline jobs use code (Jenkinsfile) to define the job structure. They're more powerful and flexible.

**Structure:**
```
Pipeline Job
├── General Settings
├── Pipeline Configuration
│   ├── Pipeline Script (embedded)
│   └── Pipeline Script from SCM
├── Pipeline Stages
│   ├── Checkout
│   ├── Build  
│   ├── Test
│   ├── Security Scan
│   ├── Deploy to Staging
│   ├── Integration Tests
│   └── Deploy to Production
└── Pipeline Features
    ├── Parallel execution
    ├── Conditional stages
    ├── Manual approvals
    └── Error handling
```

**Example: Complete CI/CD Pipeline**

```groovy
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '16'
        APP_NAME = 'my-ecommerce-app'
        STAGING_SERVER = 'staging.company.com'
        PROD_SERVER = 'production.company.com'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                echo 'Setting up environment...'
                sh '''
                    node --version
                    npm --version
                    npm install
                '''
            }
            post {
                success {
                    archiveArtifacts artifacts: '*.tar.gz', fingerprint: true
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                script {
                    echo 'Building Docker image...'
                    def image = docker.build("${IMAGE_TAG}")
                    
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry-credentials') {
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }
        
        stage('Deploy to Development') {
            steps {
                echo 'Deploying to development environment...'
                sh '''
                    # Deploy using Kubernetes
                    kubectl set image deployment/${APP_NAME} \
                        ${APP_NAME}=${IMAGE_TAG} \
                        --namespace=development
                    
                    # Wait for deployment to complete
                    kubectl rollout status deployment/${APP_NAME} \
                        --namespace=development \
                        --timeout=300s
                '''
            }
        }
        
        stage('Smoke Tests - Dev') {
            steps {
                echo 'Running smoke tests on development...'
                sh '''
                    # Basic health check
                    curl -f https://dev.ecommerce.company.com/health
                    
                    # Key functionality tests
                    npx newman run smoke-tests/basic-functionality.json \
                        --environment smoke-tests/dev-environment.json
                '''
            }
        }
        
        stage('Deploy to Staging') {
            when {
                anyOf {
                    branch 'main'
                    branch 'release/*'
                }
            }
            steps {
                echo 'Deploying to staging environment...'
                sh '''
                    kubectl set image deployment/${APP_NAME} \
                        ${APP_NAME}=${IMAGE_TAG} \
                        --namespace=staging
                    
                    kubectl rollout status deployment/${APP_NAME} \
                        --namespace=staging \
                        --timeout=300s
                '''
            }
        }
        
        stage('Full Regression Tests') {
            when {
                anyOf {
                    branch 'main'
                    branch 'release/*'
                }
            }
            steps {
                echo 'Running full regression test suite...'
                sh '''
                    # Run comprehensive test suite
                    npx cypress run \
                        --config baseUrl=https://staging.ecommerce.company.com \
                        --reporter junit \
                        --reporter-options mochaFile=cypress-results.xml
                '''
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'cypress-results.xml'
                }
            }
        }
        
        stage('Performance Tests') {
            when {
                anyOf {
                    branch 'main'
                    branch 'release/*'
                }
            }
            steps {
                echo 'Running performance tests...'
                sh '''
                    # Load testing with Artillery
                    npx artillery run performance-tests/load-test.yml \
                        --output performance-results.json
                    
                    # Generate HTML report
                    npx artillery report performance-results.json \
                        --output performance-report.html
                '''
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: '.',
                        reportFiles: 'performance-report.html',
                        reportName: 'Performance Test Report'
                    ])
                }
            }
        }
        
        stage('Manual QA Approval') {
            when {
                branch 'main'
            }
            steps {
                timeout(time: 24, unit: 'HOURS') {
                    input(
                        message: 'QA Team: Ready for Production Deployment?',
                        ok: 'Deploy to Production',
                        parameters: [
                            choice(
                                name: 'DEPLOYMENT_TYPE',
                                choices: ['Blue-Green', 'Rolling', 'Canary'],
                                description: 'Select deployment strategy'
                            ),
                            string(
                                name: 'APPROVER_EMAIL',
                                defaultValue: '',
                                description: 'Your email address'
                            )
                        ],
                        submitterParameter: 'APPROVER'
                    )
                }
            }
        }
        
        stage('Production Deployment') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "Deploying to production using ${DEPLOYMENT_TYPE} strategy..."
                    echo "Approved by: ${APPROVER} (${APPROVER_EMAIL})"
                    
                    if (params.DEPLOYMENT_TYPE == 'Blue-Green') {
                        sh '''
                            # Blue-Green deployment
                            ./scripts/blue-green-deploy.sh \
                                --image=${IMAGE_TAG} \
                                --namespace=production \
                                --app=${APP_NAME}
                        '''
                    } else if (params.DEPLOYMENT_TYPE == 'Canary') {
                        sh '''
                            # Canary deployment (10% traffic)
                            ./scripts/canary-deploy.sh \
                                --image=${IMAGE_TAG} \
                                --namespace=production \
                                --app=${APP_NAME} \
                                --traffic-split=10
                        '''
                    } else {
                        sh '''
                            # Rolling deployment
                            kubectl set image deployment/${APP_NAME} \
                                ${APP_NAME}=${IMAGE_TAG} \
                                --namespace=production
                            
                            kubectl rollout status deployment/${APP_NAME} \
                                --namespace=production \
                                --timeout=600s
                        '''
                    }
                }
            }
        }
        
        stage('Production Health Checks') {
            when {
                branch 'main'
            }
            steps {
                echo 'Verifying production deployment...'
                sh '''
                    # Health check
                    curl -f https://ecommerce.company.com/health
                    
                    # Database connectivity
                    curl -f https://ecommerce.company.com/api/health/database
                    
                    # Cache connectivity
                    curl -f https://ecommerce.company.com/api/health/cache
                    
                    # External services
                    curl -f https://ecommerce.company.com/api/health/external
                    
                    # Sample user journey
                    npx newman run production-tests/user-journey.json \
                        --environment production-tests/prod-environment.json
                '''
            }
        }
        
        stage('Canary Traffic Increase') {
            when {
                allOf {
                    branch 'main'
                    expression { params.DEPLOYMENT_TYPE == 'Canary' }
                }
            }
            steps {
                script {
                    def trafficSteps = [25, 50, 75, 100]
                    
                    for (traffic in trafficSteps) {
                        timeout(time: 10, unit: 'MINUTES') {
                            input(
                                message: "Increase canary traffic to ${traffic}%?",
                                ok: "Increase to ${traffic}%"
                            )
                        }
                        
                        echo "Increasing canary traffic to ${traffic}%..."
                        sh """
                            ./scripts/canary-traffic.sh \
                                --namespace=production \
                                --app=${APP_NAME} \
                                --traffic-split=${traffic}
                        """
                        
                        echo "Monitoring for 2 minutes..."
                        sleep(120)
                        
                        // Health check after traffic increase
                        sh '''
                            curl -f https://ecommerce.company.com/health
                            ./scripts/check-error-rate.sh --threshold=1.0
                        '''
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline completed. Cleaning up...'
            cleanWs()
        }
        
        success {
            script {
                if (env.BRANCH_NAME == 'main') {
                    slackSend(
                        channel: env.SLACK_CHANNEL,
                        color: 'good',
                        message: """
                        ✅ *${APP_NAME}* successfully deployed to production!
                        
                        *Build:* ${BUILD_VERSION}
                        *Commit:* ${GIT_COMMIT[0..7]}
                        *Approver:* ${env.APPROVER ?: 'N/A'}
                        *Strategy:* ${params.DEPLOYMENT_TYPE ?: 'N/A'}
                        
                        🔗 [View Build](${BUILD_URL})
                        🌐 [Production](https://ecommerce.company.com)
                        """
                    )
                    
                    emailext(
                        to: 'team@company.com',
                        subject: "✅ ${APP_NAME} v${BUILD_VERSION} deployed successfully",
                        body: """
                        The ${APP_NAME} application has been successfully deployed to production.
                        
                        Build Details:
                        - Version: ${BUILD_VERSION}
                        - Commit: ${GIT_COMMIT}
                        - Build URL: ${BUILD_URL}
                        - Deployment Strategy: ${params.DEPLOYMENT_TYPE ?: 'N/A'}
                        - Approved by: ${env.APPROVER ?: 'N/A'}
                        
                        Production URL: https://ecommerce.company.com
                        """
                    )
                }
            }
        }
        
        failure {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: 'danger',
                message: """
                ❌ *${APP_NAME}* deployment failed!
                
                *Build:* ${BUILD_VERSION}
                *Branch:* ${env.BRANCH_NAME}
                *Failed Stage:* ${env.STAGE_NAME}
                
                🔗 [View Build](${BUILD_URL})
                📋 [Console Output](${BUILD_URL}console)
                """
            )
            
            emailext(
                to: 'team@company.com',
                subject: "❌ ${APP_NAME} deployment failed - Build #${BUILD_NUMBER}",
                body: """
                The ${APP_NAME} deployment has failed.
                
                Build Details:
                - Build Number: ${BUILD_NUMBER}
                - Branch: ${env.BRANCH_NAME}
                - Failed at Stage: ${env.STAGE_NAME}
                - Build URL: ${BUILD_URL}
                - Console Output: ${BUILD_URL}console
                
                Please check the logs and take necessary action.
                """
            )
        }
        
        unstable {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: 'warning',
                message: """
                ⚠️ *${APP_NAME}* build is unstable
                
                *Build:* ${BUILD_VERSION}
                *Branch:* ${env.BRANCH_NAME}
                *Issues:* Test failures or quality gate warnings
                
                🔗 [View Build](${BUILD_URL})
                """
            )
        }
    }
}
```

### Example 2: Mobile App CI/CD with Multiple Platforms

**Scenario:** A React Native mobile app that needs to be built for both iOS and Android, with automated testing and distribution to app stores.

```groovy
pipeline {
    agent none
    
    environment {
        APP_NAME = 'MyMobileApp'
        IOS_SCHEME = 'MyMobileApp'
        ANDROID_GRADLE_FILE = 'android/app/build.gradle'
        FASTLANE_SKIP_UPDATE_CHECK = '1'
    }
    
    stages {
        stage('Checkout & Setup') {
            agent { label 'mobile-build' }
            steps {
                checkout scm
                sh '''
                    node --version
                    npm --version
                    react-native --version
                '''
            }
        }
        
        stage('Install Dependencies') {
            agent { label 'mobile-build' }
            steps {
                sh '''
                    npm install
                    cd ios && pod install && cd ..
                '''
            }
        }
        
        stage('Code Quality & Tests') {
            parallel {
                stage('Lint & Type Check') {
                    agent { label 'mobile-build' }
                    steps {
                        sh '''
                            npm run lint
                            npm run typecheck
                        '''
                    }
                }
                
                stage('Unit Tests') {
                    agent { label 'mobile-build' }
                    steps {
                        sh 'npm test -- --coverage --watchAll=false'
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'coverage/junit.xml'
                        }
                    }
                }
            }
        }
        
        stage('Build Apps') {
            parallel {
                stage('Build Android') {
                    agent { label 'android-build' }
                    environment {
                        ANDROID_HOME = '/opt/android-sdk'
                    }
                    steps {
                        sh '''
                            cd android
                            ./gradlew assembleRelease
                        '''
                    }
                    post {
                        success {
                            archiveArtifacts artifacts: 'android/app/build/outputs/apk/release/*.apk'
                        }
                    }
                }
                
                stage('Build iOS') {
                    agent { label 'ios-build' }
                    steps {
                        sh '''
                            cd ios
                            xcodebuild -workspace ${IOS_SCHEME}.xcworkspace \
                                      -scheme ${IOS_SCHEME} \
                                      -configuration Release \
                                      -archivePath build/${IOS_SCHEME}.xcarchive \
                                      archive
                        '''
                    }
                    post {
                        success {
                            archiveArtifacts artifacts: 'ios/build/*.xcarchive/**'
                        }
                    }
                }
            }
        }
        
        stage('Automated Testing') {
            parallel {
                stage('Android E2E Tests') {
                    agent { label 'android-test' }
                    steps {
                        sh '''
                            # Start Android emulator
                            emulator -avd test_emulator -no-window &
                            adb wait-for-device
                            
                            # Install and test app
                            adb install android/app/build/outputs/apk/release/app-release.apk
                            npm run test:e2e:android
                        '''
                    }
                }
                
                stage('iOS E2E Tests') {
                    agent { label 'ios-test' }
                    steps {
                        sh '''
                            # Start iOS simulator
                            xcrun simctl boot "iPhone 13"
                            
                            # Run E2E tests
                            npm run test:e2e:ios
                        '''
                    }
                }
            }
        }
        
        stage('Distribution') {
            when {
                anyOf {
                    branch 'main'
                    branch 'release/*'
                }
            }
            parallel {
                stage('Distribute Android') {
                    agent { label 'android-build' }
                    steps {
                        withCredentials([file(credentialsId: 'google-play-service-account', variable: 'GOOGLE_PLAY_KEY')]) {
                            sh '''
                                export GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_PLAY_KEY
                                
                                cd android
                                bundle exec fastlane deploy_internal
                            '''
                        }
                    }
                }
                
                stage('Distribute iOS') {
                    agent { label 'ios-build' }
                    steps {
                        withCredentials([
                            string(credentialsId: 'app-store-connect-key-id', variable: 'ASC_KEY_ID'),
                            string(credentialsId: 'app-store-connect-issuer-id', variable: 'ASC_ISSUER_ID'),
                            file(credentialsId: 'app-store-connect-key', variable: 'ASC_KEY_FILE')
                        ]) {
                            sh '''
                                export ASC_KEY_ID=$ASC_KEY_ID
                                export ASC_ISSUER_ID=$ASC_ISSUER_ID
                                export ASC_KEY_FILE=$ASC_KEY_FILE
                                
                                cd ios
                                bundle exec fastlane deploy_testflight
                            '''
                        }
                    }
                }
            }
        }
    }
}
```

### Example 3: Infrastructure as Code Pipeline

**Scenario:** Managing cloud infrastructure using Terraform with proper validation, security scanning, and staged deployments.

```groovy
pipeline {
    agent any
    
    environment {
        TF_VERSION = '1.0.0'
        AWS_DEFAULT_REGION = 'us-west-2'
        TF_VAR_environment = "${env.BRANCH_NAME == 'main' ? 'production' : 'staging'}"
    }
    
    tools {
        terraform "${TF_VERSION}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Terraform Validation') {
            steps {
                dir('infrastructure') {
                    sh '''
                        terraform fmt -check=true
                        terraform init -backend=false
                        terraform validate
                    '''
                }
            }
        }
        
        stage('Security & Policy Checks') {
            parallel {
                stage('TFSec Scan') {
                    steps {
                        dir('infrastructure') {
                            sh '''
                                tfsec . --format=checkstyle > tfsec-results.xml
                            '''
                        }
                    }
                    post {
                        always {
                            recordIssues(
                                enabledForFailure: true,
                                tools: [checkStyle(pattern: 'infrastructure/tfsec-results.xml')]
                            )
                        }
                    }
                }
                
                stage('OPA Policy Check') {
                    steps {
                        dir('infrastructure') {
                            sh '''
                                terraform plan -out=tfplan.binary
                                terraform show -json tfplan.binary > tfplan.json
                                opa test policies/
                                opa eval -d policies/ -i tfplan.json "data.terraform.deny[x]"
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Terraform Plan') {
            steps {
                dir('infrastructure') {
                    withCredentials([
                        [$class: 'AmazonWebServicesCredentialsBinding', 
                         credentialsId: 'aws-credentials']
                    ]) {
                        sh '''
                            terraform init
                            terraform plan -out=tfplan -var-file="environments/${TF_VAR_environment}.tfvars"
                            terraform show tfplan
                        '''
                    }
                }
            }
        }
        
        stage('Manual Approval') {
            when {
                branch 'main'
            }
            steps {
                timeout(time: 30, unit: 'MINUTES') {
                    script {
                        def plan = readFile('infrastructure/tfplan.txt')
                        input(
                            message: 'Review Terraform plan and approve deployment',
                            ok: 'Deploy Infrastructure',
                            parameters: [
                                text(
                                    name: 'TERRAFORM_PLAN',
                                    defaultValue: plan,
                                    description: 'Terraform execution plan'
                                )
                            ]
                        )
                    }
                }
            }
        }
        
        stage('Terraform Apply') {
            steps {
                dir('infrastructure') {
                    withCredentials([
                        [$class: 'AmazonWebServicesCredentialsBinding', 
                         credentialsId: 'aws-credentials']
                    ]) {
                        sh '''
                            terraform apply tfplan
                            terraform output -json > terraform-outputs.json
                        '''
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'infrastructure/terraform-outputs.json'
                }
            }
        }
        
        stage('Infrastructure Testing') {
            steps {
                dir('infrastructure/tests') {
                    sh '''
                        # Run infrastructure tests using Terratest
                        go test -v -timeout 30m
                    '''
                }
            }
        }
    }
    
    post {
        always {
            dir('infrastructure') {
                sh 'terraform destroy -auto-approve || true'
            }
        }
    }
}
```

## Job Monitoring and Troubleshooting

### Understanding Build Logs

Every Jenkins job execution creates detailed logs. Here's how to read them:

```
Started by user admin
Running as SYSTEM
Building in workspace /var/jenkins_home/workspace/my-app
The recommended git tool is: NONE
using credential github-ssh-key
Cloning the remote Git repository
Cloning repository git@github.com:company/my-app.git
 > git init /var/jenkins_home/workspace/my-app # timeout=10
 > git remote add origin git@github.com:company/my-app.git # timeout=10
 > git config remote.origin.url git@github.com:company/my-app.git # timeout=10
 > git config --add remote.origin.fetch +refs/heads/*:refs/remotes/origin/* # timeout=10
 > git config remote.origin.url git@github.com:company/my-app.git # timeout=10
Fetching upstream changes from git@github.com:company/my-app.git
 > git --version # timeout=10
 > git --version # 'git version 2.30.2'
using GIT_SSH to set credentials GitHub SSH Key
 > git fetch --tags --force --progress -- origin +refs/heads/*:refs/remotes/origin/* # timeout=10
 > git rev-parse refs/remotes/origin/main^{commit} # timeout=10
Checking out Revision 7d4f2c1a8b9e3f6d2e5a7c8b9d0f1e2a3b4c5d6e (refs/remotes/origin/main)
 > git config core.sparsecheckout # timeout=10
 > git checkout -f 7d4f2c1a8b9e3f6d2e5a7c8b9d0f1e2a3b4c5d6e # timeout=10
Commit message: "Fix user authentication bug"
First time build. Skipping changelog.
[my-app] $ /bin/sh -xe /tmp/jenkins123.sh
+ echo 'Installing dependencies...'
Installing dependencies...
+ npm install
npm WARN deprecated package@1.0.0: This package is deprecated
added 1247 packages from 837 contributors and audited 1247 packages in 23.456s
+ echo 'Running tests...'
Running tests...
+ npm test
> my-app@1.0.0 test
> jest --coverage

 PASS  src/components/Login.test.js
 PASS  src/components/Dashboard.test.js
 FAIL  src/utils/auth.test.js
   ● Authentication › should validate user credentials

     expect(received).toBe(expected) // Object.is equality

     Expected: true
     Received: false

       at Object.<anonymous> (src/utils/auth.test.js:15:32)

Test Suites: 1 failed, 2 passed, 3 total
Tests:       1 failed, 12 passed, 13 total
Snapshots:   0 total
Time:        3.847 s
Ran all test suites.
Build step 'Execute shell' marked build as failure
Finished: FAILURE
```

### Common Troubleshooting Scenarios

#### 1. **Permission Issues**
```
Error: Permission denied (publickey)
Solution:
- Check SSH key configuration
- Verify credentials are correctly set
- Ensure Jenkins user has proper permissions
```

#### 2. **Environment Issues**
```
Error: command not found: npm
Solution:
- Install Node.js on Jenkins agent
- Configure PATH environment variable
- Use Docker containers for consistent environments
```

#### 3. **Resource Issues**
```
Error: Java heap space OutOfMemoryError
Solution:
- Increase Jenkins JVM heap size
- Add more memory to Jenkins server
- Optimize build processes
```

#### 4. **Network Issues**
```
Error: timeout while fetching repository
Solution:
- Check network connectivity
- Verify firewall settings
- Use SSH instead of HTTPS for Git
```

### Best Practices for Jenkins Jobs

#### 1. **Job Naming Conventions**
```
Good Examples:
- frontend-web-app-build
- user-service-deploy-staging
- infrastructure-terraform-plan
- mobile-app-ios-test

Bad Examples:
- job1
- test
- build-stuff
- app
```

#### 2. **Job Organization**
```
Folder Structure:
Company/
├── Frontend Applications/
│   ├── Web App/
│   │   ├── web-app-build
│   │   ├── web-app-test
│   │   └── web-app-deploy
│   └── Mobile App/
│       ├── mobile-app-build
│       └── mobile-app-deploy
├── Backend Services/
│   ├── User Service/
│   └── Payment Service/
└── Infrastructure/
    ├── terraform-plan
    └── terraform-apply
```

#### 3. **Security Best Practices**
```groovy
// Use credentials properly
withCredentials([
    string(credentialsId: 'api-key', variable: 'API_KEY'),
    usernamePassword(credentialsId: 'db-creds', 
                     usernameVariable: 'DB_USER', 
                     passwordVariable: 'DB_PASS')
]) {
    sh '''
        # Use $API_KEY, $DB_USER, $DB_PASS here
        # These variables are masked in logs
    '''
}

// Never do this:
sh 'curl -H "Authorization: Bearer hardcoded-token-here"'
```

#### 4. **Performance Optimization**
```groovy
pipeline {
    agent any
    
    options {
        // Keep only last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        
        // Set timeout for entire pipeline
        timeout(time: 1, unit: 'HOURS')
        
        // Skip default checkout
        skipDefaultCheckout(true)
        
        // Disable concurrent builds
        disableConcurrentBuilds()
    }
    
    stages {
        stage('Parallel Tasks') {
            parallel {
                stage('Fast Task') {
                    steps {
                        echo 'Quick operation'
                    }
                }
                
                stage('Slow Task') {
                    steps {
                        echo 'Long running operation'
                    }
                }
            }
        }
    }
}
```

## Conclusion

Jenkins jobs are the backbone of modern DevOps practices. They transform manual, error-prone processes into automated, reliable workflows. By understanding job structures, you can:

- **Reduce deployment time** from hours to minutes
- **Eliminate human errors** in deployments
- **Increase deployment frequency** safely
- **Improve code quality** through automated testing
- **Enable faster feedback** to developers
- **Scale development processes** across teams

Whether you're building a simple web application or managing complex microservices architecture, Jenkins jobs provide the foundation for continuous integration and continuous deployment that modern software development requires.

The key is to start simple with freestyle jobs, then evolve to pipeline jobs as your needs become more complex. Remember: every manual process you automate is time saved, errors prevented, and quality improved.

**Next Steps:**
1. Install Jenkins and create your first freestyle job
2. Convert existing manual processes to Jenkins jobs
3. Learn Jenkinsfile syntax for pipeline jobs
4. Implement proper monitoring and alerting
5. Scale with Jenkins agents and distributed builds

Happy automating! 🚀}
        }
        
        stage('Code Quality') {
            parallel {
                stage('Lint') {
                    steps {
                        echo 'Running linter...'
                        sh 'npm run lint'
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        echo 'Running security scan...'
                        sh 'npm audit --audit-level moderate'
                    }
                }
            }
        }
        
        stage('Test') {
            steps {
                echo 'Running tests...'
                sh 'npm test -- --coverage'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results.xml'
                    publishCoverageReport(
                        htmlDir: 'coverage',
                        htmlFiles: 'index.html'
                    )
                }
            }
        }
        
        stage('Build') {
            steps {
                echo 'Building application...'
                sh 'npm run build'
            }
        }
        
        stage('Deploy to Staging') {
            steps {
                echo 'Deploying to staging...'
                sh '''
                    rsync -avz build/ user@${STAGING_SERVER}:/var/www/${APP_NAME}/
                    ssh user@${STAGING_SERVER} "sudo systemctl restart ${APP_NAME}"
                '''
            }
        }
        
        stage('Integration Tests') {
            steps {
                echo 'Running integration tests on staging...'
                sh 'npm run test:integration -- --env=staging'
            }
        }
        
        stage('Manual Approval') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    input message: 'Deploy to production?', 
                          ok: 'Deploy',
                          submitterParameter: 'APPROVER'
                }
            }
        }
        
        stage('Deploy to Production') {
            steps {
                echo "Deploying to production (approved by ${APPROVER})..."
                sh '''
                    rsync -avz build/ user@${PROD_SERVER}:/var/www/${APP_NAME}/
                    ssh user@${PROD_SERVER} "sudo systemctl restart ${APP_NAME}"
                '''
            }
        }
    }
    
    post {
        success {
            emailext(
                to: 'team@company.com',
                subject: "✅ ${APP_NAME} deployed successfully",
                body: "Build #${BUILD_NUMBER} deployed to production successfully!"
            )
        }
        
        failure {
            emailext(
                to: 'team@company.com',
                subject: "❌ ${APP_NAME} deployment failed",
                body: "Build #${BUILD_NUMBER} failed. Please check Jenkins console output."
            )
        }
        
        always {
            archiveArtifacts artifacts: 'build/**', fingerprint: true
            cleanWs()
        }
    }
}
```

### 3. Multi-branch Pipeline: The Smart Branch Manager

**Structure:**
```
Multi-branch Pipeline
├── Branch Sources
│   ├── GitHub/GitLab/Bitbucket
│   ├── Repository scanning
│   └── Branch discovery strategies
├── Build Configuration
│   ├── Script Path (Jenkinsfile location)
│   ├── Property strategy
│   └── Orphaned item strategy
├── Scan Triggers
│   ├── Periodic scanning
│   ├── Webhook triggers
│   └── Manual scanning
└── Automatically Created Jobs
    ├── main branch job
    ├── develop branch job
    ├── feature/user-auth job
    └── release/v1.2.0 job
```

---

## Deep Dive: How Jenkins Jobs Actually Work {#how-jenkins-jobs-work}

### The Job Execution Lifecycle

Let's follow a job from trigger to completion:

#### 1. Job Trigger Phase
```
Trigger Event Occurs
├── Code pushed to repository
├── Scheduled time reached
├── Another job completes
└── Manual trigger by user
        ↓
Jenkins detects the trigger
        ↓
Job added to build queue
```

#### 2. Resource Allocation Phase
```
Jenkins checks available executors
├── Master node available?
├── Slave nodes available?
└── Resource requirements met?
        ↓
Job assigned to executor
        ↓
Workspace allocated/cleaned
```

#### 3. Job Preparation Phase
```
Workspace Setup
├── Clean workspace (if configured)
├── Checkout source code
├── Set environment variables
└── Prepare build tools
        ↓
Job ready to execute
```

#### 4. Job Execution Phase
```
Execute Build Steps (Sequential)
├── Step 1: Install dependencies
│   ├── Command: npm install
│   ├── Exit code: 0 (success)
│   └── Continue to next step
├── Step 2: Run tests
│   ├── Command: npm test
│   ├── Exit code: 1 (failure)
│   └── STOP! Job marked as failed
└── Post-build actions still run
```

#### 5. Post-Processing Phase
```
Post-build Actions
├── Archive artifacts (if any)
├── Publish test results
├── Send notifications
└── Trigger downstream jobs
        ↓
Update job status
        ↓
Clean up resources
```

### Understanding Build Status

```
BUILD STATUSES:
├── SUCCESS (✅) - All steps completed successfully
├── FAILURE (❌) - One or more steps failed
├── UNSTABLE (⚠️) - Build succeeded but tests failed/flaky
├── ABORTED (⏹️) - Job was manually stopped or timed out
└── NOT_BUILT (⚪) - Job was skipped or not executed
```

### Job Dependencies and Triggers

```
Job Trigger Chain Example:

Code Push to GitHub
        ↓
├── Unit Test Job (triggered immediately)
│   ├── SUCCESS → Continue
│   └── FAILURE → Stop chain, notify team
        ↓
├── Integration Test Job (triggered by Unit Test success)
│   ├── SUCCESS → Continue  
│   └── FAILURE → Stop chain, notify team
        ↓
├── Security Scan Job (triggered by Integration Test success)
│   ├── SUCCESS → Continue
│   └── FAILURE → Stop chain, notify security team
        ↓
├── Deploy to Staging Job (triggered by Security Scan success)
│   ├── SUCCESS → Continue
│   └── FAILURE → Stop chain, notify ops team
        ↓
├── Manual Approval Gate
│   ├── APPROVED → Continue to production
│   └── REJECTED → Stop chain
        ↓
└── Deploy to Production Job (triggered by manual approval)
    ├── SUCCESS → Notify team of successful deployment
    └── FAILURE → Rollback, notify team
```

---

## Job Configuration Structure {#job-configuration-structure}

### Configuration as Code vs GUI Configuration

#### GUI Configuration (Traditional Way)
- Click through Jenkins web interface
- Configuration stored in XML files
- Hard to version control
- Difficult to replicate across environments

#### Configuration as Code (Modern Way)
- Everything defined in code (Jenkinsfile)
- Version controlled with your source code
- Easy to replicate and review
- Better for team collaboration

### Detailed Configuration Options

#### 1. Source Code Management Configuration

```yaml
SCM Configuration Options:
├── Git
│   ├── Repository URL
│   ├── Credentials (SSH key, username/password, token)
│   ├── Branches to build
│   ├── Additional behaviors
│   │   ├── Clean before checkout
│   │   ├── Checkout to specific directory
│   │   ├── Sparse checkout paths
│   │   └── Submodule behavior
│   └── Repository browser
├── Subversion
├── Mercurial  
└── Perforce
```

**Example Git Configuration:**
```groovy
checkout([
    $class: 'GitSCM',
    branches: [[name: '*/main']],
    doGenerateSubmoduleConfigurations: false,
    extensions: [
        [$class: 'CleanBeforeCheckout'],
        [$class: 'SubmoduleOption', 
         disableSubmodules: false, 
         parentCredentials: true, 
         recursiveSubmodules: true]
    ],
    submoduleCfg: [],
    userRemoteConfigs: [[
        credentialsId: 'github-ssh-key',
        url: 'git@github.com:company/my-app.git'
    ]]
])
```

#### 2. Build Triggers Configuration

```yaml
Build Triggers:
├── Poll SCM
│   ├── Schedule: H/5 * * * * (every 5 minutes)
│   ├── Ignore post-commit hooks: false
│   └── Use post-receive hooks: true
├── Build after other projects are built
│   ├── Projects to watch: "upstream-job"
│   └── Trigger only if stable: true
├── Build periodically
│   ├── Schedule: H 2 * * * (daily at 2 AM)
│   └── Time zone: (Default)
├── GitHub hook trigger for GITScm polling
├── Generic Webhook Trigger
│   ├── Token: secret-webhook-token
│   └── Cause: "Triggered by external system"
└── Trigger builds remotely
    ├── Authentication Token: build-token-123
    └── URL: http://jenkins.company.com/job/my-job/build?token=build-token-123
```

#### 3. Build Environment Configuration

```yaml
Build Environment:
├── Delete workspace before build starts: true
├── Use secret text(s) or file(s)
│   ├── Secret text variables
│   │   ├── Variable: DATABASE_PASSWORD
│   │   └── Credentials: database-secret
│   └── Secret files
│       ├── Variable: SERVICE_ACCOUNT_KEY
│       └── Credentials: gcp-service-account
├── Add timestamps to Console Output: true
├── Set up environment variables
│   ├── ENVIRONMENT: staging
│   ├── APP_VERSION: ${BUILD_NUMBER}
│   └── NODE_ENV: production
├── Provide Node & npm bin/ folder to PATH: true
├── With Ant
├── Abort the build if it's stuck: true
│   ├── Time-out strategy: Absolute
│   └── Timeout: 30 minutes
└── Run the build in a Docker container
    ├── Docker image: node:16-alpine
    └── Docker arguments: -v /tmp:/tmp
```

#### 4. Build Steps Configuration

```yaml
Build Steps (Executed Sequentially):
├── Execute shell/batch command
│   ├── Command: |
│   │   echo "Starting build process..."
│   │   npm install --production
│   │   npm run build
│   └── Advanced options
│       ├── Exit code to set build unstable: 2
│       └── Exit code to set build failure: 1
├── Invoke Ant
│   ├── Targets: clean compile test
│   ├── Build File: build.xml
│   └── Properties: version=${BUILD_NUMBER}
├── Invoke top-level Maven targets
│   ├── Goals: clean install
│   ├── Maven Version: Maven-3.8
│   └── POM: pom.xml
├── Invoke Gradle script
│   ├── Tasks: clean build
│   ├── Build File: build.gradle
│   └── Gradle Version: Gradle-7.0
├── Execute Python script
├── Send files or execute commands over SSH
│   ├── SSH Server: production-server
│   ├── Source files: build/**
│   ├── Remote directory: /var/www/app/
│   └── Exec command: sudo systemctl restart app
└── Conditional Build Steps
    ├── Condition: Current build result is SUCCESS
    └── Steps to run if condition met
```

---

## Advanced Job Patterns {#advanced-job-patterns}

### 1. Fan-Out/Fan-In Pattern

This pattern allows you to run multiple jobs in parallel and then combine their results.

```
Main Build Job
      ↓
┌─────────────────┐
│   Unit Tests    │
│  Integration    │  ← Run in parallel
│  Security Scan  │
└─────────────────┘
      ↓
  Combine Results
      ↓
   Deploy Job
```

**Implementation:**
```groovy
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        
        stage('Parallel Testing') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit'
                    }
                    post {
                        always {
                            publishTestResults 'unit-test-results.xml'
                        }
                    }
                }
                
                stage('Integration Tests') {
                    steps {
                        sh 'npm run test:integration'
                    }
                    post {
                        always {
                            publishTestResults 'integration-test-results.xml'
                        }
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        sh 'npm audit --json > security-report.json'
                    }
                    post {
                        always {
                            archiveArtifacts 'security-report.json'
                        }
                    }
                }
            }
        }
        
        stage('Deploy') {
            when {
                allOf {
                    expression { currentBuild.result == null }
                    branch 'main'
                }
            }
            steps {
                sh 'npm run deploy'
            }
        }
    }
}
```

### 2. Blue-Green Deployment Pattern

```
Production Traffic → Blue Environment (Current)
                  ↘
                   Switch → Green Environment (New)
```

**Implementation:**
```groovy
pipeline {
    agent any
    
    environment {
        BLUE_SERVER = 'blue.production.com'
        GREEN_SERVER = 'green.production.com'
        LOAD_BALANCER = 'lb.production.com'
    }
    
    stages {
        stage('Deploy to Green') {
            steps {
                echo 'Deploying to Green environment...'
                sh '''
                    # Deploy to green environment
                    rsync -avz build/ user@${GREEN_SERVER}:/var/www/app/
                    ssh user@${GREEN_SERVER} "sudo systemctl restart app"
                    
                    # Wait for green to be healthy
                    sleep 30
                '''
            }
        }
        
        stage('Health Check Green') {
            steps {
                script {
                    def response = sh(
                        script: "curl -f http://${GREEN_SERVER}/health",
                        returnStatus: true
                    )
                    if (response != 0) {
                        error("Green environment health check failed")
                    }
                }
            }
        }
        
        stage('Switch Traffic') {
            input {
                message "Switch traffic to Green environment?"
                ok "Switch"
                parameters {
                    choice(
                        name: 'SWITCH_TRAFFIC',
                        choices: ['Yes', 'No'],
                        description: 'Switch production traffic to Green?'
                    )
                }
            }
            when {
                expression { params.SWITCH_TRAFFIC == 'Yes' }
            }
            steps {
                echo 'Switching traffic to Green...'
                sh '''
                    # Update load balancer to point to green
                    curl -X POST "${LOAD_BALANCER}/switch-to-green"
                    
                    # Verify traffic is flowing to green
                    sleep 10
                    curl -f "${LOAD_BALANCER}/health"
                '''
            }
        }
        
        stage('Cleanup Blue') {
            when {
                expression { params.SWITCH_TRAFFIC == 'Yes' }
            }
            steps {
                echo 'Blue environment is now standby'
                // Keep blue running as standby for quick rollback
            }
        }
    }
    
    post {
        failure {
            echo 'Deployment failed, keeping Blue environment active'
        }
    }
}
```

### 3. Matrix/Multi-Configuration Jobs

Test your application across multiple environments, versions, or configurations.

```groovy
pipeline {
    agent none
    
    stages {
        stage('Matrix Build') {
            matrix {
                axes {
                    axis {
                        name 'NODE_VERSION'
                        values '14', '16', '18'
                    }
                    axis {
                        name 'OS'
                        values 'ubuntu', 'windows', 'macos'
                    }
                }
                excludes {
                    exclude {
                        axis {
                            name 'NODE_VERSION'
                            values '14'
                        }
                        axis {
                            name 'OS'
                            values 'macos'
                        }
                    }
                }
                stages {
                    stage('Test') {
                        agent {
                            label "${OS}"
                        }
                        steps {
                            echo "Testing on ${OS} with Node.js ${NODE_VERSION}"
                            sh '''
                                node --version
                                npm --version
                                npm install
                                npm test
                            '''
                        }
                    }
                }
            }
        }
    }
}
```

---

## Real-World Examples {#real-world-examples}

### Example 1: E-commerce Platform CI/CD

**Scenario:** A large e-commerce platform with microservices architecture, requiring comprehensive testing and staged deployments.

**Job Structure:**
```
E-commerce Pipeline
├── Source Code Checkout
├── Dependency Installation & Caching
├── Code Quality Gates
│   ├── Linting (ESLint, Prettier)
│   ├── Security Scanning (npm audit, Snyk)
│   ├── Code Coverage (Jest)
│   └── Static Analysis (SonarQube)
├── Testing Suite
│   ├── Unit Tests (Jest)
│   ├── Integration Tests (Cypress)
│   ├── API Tests (Newman/Postman)
│   └── Performance Tests (Artillery)
├── Build & Package
│   ├── Frontend Build (React)
│   ├── Backend Build (Node.js)
│   ├── Docker Image Creation
│   └── Artifact Storage (Nexus)
├── Deployment Pipeline
│   ├── Deploy to Dev Environment
│   ├── Smoke Tests on Dev
│   ├── Deploy to Staging Environment
│   ├── Full Regression Tests
│   ├── Manual QA Approval
│   ├── Deploy to Production (Blue-Green)
│   └── Production Health Checks
└── Monitoring & Notifications
    ├── Deployment Metrics
    ├── Performance Monitoring
    └── Team Notifications
```

**Complete Jenkinsfile:**
```groovy
pipeline {
    agent any
    
    environment {
        APP_NAME = 'ecommerce-platform'
        DOCKER_REGISTRY = 'registry.company.com'
        SONAR_PROJECT_KEY = 'ecommerce-platform'
        SLACK_CHANNEL = '#deployments'
    }
    
    tools {
        nodejs 'NodeJS-16'
        dockerTool 'Docker-20'
    }
    
    stages {
        stage('Checkout & Setup') {
            steps {
                echo 'Checking out source code...'
                checkout scm
                
                script {
                    env.BUILD_VERSION = "v${BUILD_NUMBER}-${GIT_COMMIT[0..7]}"
                    env.IMAGE_TAG = "${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_VERSION}"
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'
                sh '''
                    npm ci --only=production
                    npm ci --only=development
                '''
            }
            post {
                success {
                    // Cache node_modules for faster builds
                    stash includes: 'node_modules/**', name: 'node_modules'
                }
            }
        }
        
        stage('Code Quality Gates') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'npm run lint -- --format=checkstyle > lint-results.xml'
                    }
                    post {
                        always {
                            recordIssues(
                                enabledForFailure: true,
                                tools: [checkStyle(pattern: 'lint-results.xml')]
                            )
                        }
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        sh '''
                            npm audit --audit-level moderate --json > security-audit.json
                            npx snyk test --json > snyk-results.json || true
                        '''
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: '*.json'
                        }
                    }
                }
                
                stage('SonarQube Analysis') {
                    environment {
                        SONAR_TOKEN = credentials('sonarqube-token')
                    }
                    steps {
                        sh '''
                            npx sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.sources=src \
                                -Dsonar.host.url=https://sonarqube.company.com \
                                -Dsonar.login=${SONAR_TOKEN}
                        '''
                    }
                }
            }
        }
        
        stage('Testing Suite') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit -- --coverage --reporters=default --reporters=jest-junit'
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'junit.xml'
                            publishCoverageReports([
                                [
                                    path: 'coverage/lcov.info',
                                    thresholds: [
                                        [
                                            failUnhealthy: false,
                                            thresholdTarget: 'Line',
                                            unhealthyThreshold: 80.0,
                                            unstableThreshold: 70.0
                                        ]
                                    ]
                                ]
                            ])
                        }
                    }
                }
                
                stage('Integration Tests') {
                    steps {
                        sh '''
                            # Start test database
                            docker run -d --name test-db \
                                -e POSTGRES_DB=testdb \
                                -e POSTGRES_USER=test \
                                -e POSTGRES_PASSWORD=test \
                                -p 5432:5432 postgres:13
                            
                            # Wait for database to be ready
                            sleep 10
                            
                            # Run integration tests
                            npm run test:integration
                        '''
                    }
                    post {
                        always {
                            sh 'docker stop test-db && docker rm test-db || true'
                        }
                    }
                }
                
                stage('API Tests') {
                    steps {
                        sh '''
                            # Start application in test mode
                            npm start &
                            APP_PID=$!
                            
                            # Wait for application to start
                            sleep 15
                            
                            # Run API tests
                            npx newman run api-tests/postman-collection.json \
                                --environment api-tests/test-environment.json \
                                --reporters junit
                            
                            # Stop application
                            kill $APP_PID
                        '''
                    }
                }
            }
        }
        
        stage('Build Application') {
            steps {
                echo 'Building application...'
                sh '''
                    # Build frontend
                    npm run build:frontend
                    
                    # Build backend
                    npm run build:backend
                    
                    # Create distribution package
                    tar -czf ${APP_NAME}-${BUILD_VERSION}.tar.gz dist/
                '''
                '''
                // Stash build artifacts for downstream use
                stash includes: "${APP_NAME}-${BUILD_VERSION}.tar.gz", name: 'build-artifacts'
            }
            post {
                success {
                    archiveArtifacts artifacts: "${APP_NAME}-${BUILD_VERSION}.tar.gz"
                }
            }
        }
        
        stage('Docker Build & Push') {
            steps {
                echo "Building and pushing Docker image: ${IMAGE_TAG}"
                sh '''
                    docker build -t ${IMAGE_TAG} .
                    docker login ${DOCKER_REGISTRY} -u $DOCKER_USER -p $DOCKER_PASS
                    docker push ${IMAGE_TAG}
                '''
            }
        }
        
        stage('Deploy to Staging') {
            steps {
                echo "Deploying ${IMAGE_TAG} to staging environment..."
                sh '''
                    # Example: using docker-compose for staging
                    docker-compose -f docker-compose.staging.yml up -d --build
                '''
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: "Deploy ${IMAGE_TAG} to Production?", ok: "Deploy"
                echo "Deploying ${IMAGE_TAG} to production..."
                sh '''
                    # Example: using kubectl
                    kubectl set image deployment/${APP_NAME} ${APP_NAME}=${IMAGE_TAG} --record
                '''
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline finished. Cleaning up workspace...'
            cleanWs()
        }
        
        success {
            slackSend(
                channel: "${SLACK_CHANNEL}",
                color: 'good',
                message: "✅ Build #${BUILD_NUMBER} for *${APP_NAME}* succeeded. Image: ${IMAGE_TAG}"
            )
        }
        
        failure {
            slackSend(
                channel: "${SLACK_CHANNEL}",
                color: 'danger',
                message: "❌ Build #${BUILD_NUMBER} for *${APP_NAME}* failed. Check Jenkins logs."
            )
        }
    }
}
```
