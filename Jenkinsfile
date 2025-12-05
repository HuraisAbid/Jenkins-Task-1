pipeline {

    agent any

    /* ---------------------------
       PART 4 — PIPELINE PARAMETERS
       --------------------------- */
    parameters {
        string(name: 'MAJOR', defaultValue: '1', description: 'Major version')
        string(name: 'MINOR', defaultValue: '0', description: 'Minor version')
        choice(name: 'DEPLOY_ENV', choices: ['dev', 'qa', 'prod'], description: 'Select deployment environment')
    }

    environment {
        REGISTRY = 'hurais16'
        APP_NAME = 'jenkins'

        /* SEMANTIC VERSION: major.minor.buildNumber */
        VERSION = "${params.MAJOR}.${params.MINOR}.${env.BUILD_NUMBER}"
    }

    stages {

        /* PART 2 — CI PIPELINE */

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Dependency Install') {
            agent { docker { image 'node:18' args '-u root' } }
            steps { sh 'npm install' }
        }

        /* ---------------------------
           PARALLEL TESTING ADDED HERE
           --------------------------- */
        stage('Parallel Testing') {
            parallel {
                stage('Unit Tests') {
                    agent { docker { image 'node:18' args '-u root' } }
                    steps { sh 'npm test' }
                }
                stage('Lint') {
                    agent { docker { image 'node:18' args '-u root' } }
                    steps { sh 'npm run lint' }
                }
            }
        }

        stage('Integration Tests') {
            agent { docker { image 'node:18' args '-u root' } }
            steps {
                sh 'npm test tests/integration'
            }
        }

        /* ---------------------------
           PART 4 — SECURITY SCANNING
           --------------------------- */
        stage('Security Scan (Trivy)') {
            steps {
                sh """
                    docker pull aquasec/trivy:latest
                    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy --exit-code 1 --severity HIGH,CRITICAL .
                """
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t $REGISTRY/$APP_NAME:$VERSION ."
                sh "docker tag $REGISTRY/$APP_NAME:$VERSION $REGISTRY/$APP_NAME:latest"
                sh "docker tag $REGISTRY/$APP_NAME:$VERSION $REGISTRY/$APP_NAME:stable"
            }
        }

        stage('Push to Registry') {
            steps {
                withCredentials([string(credentialsId: 'dockerhub-token', variable: 'TOKEN')]) {
                    sh """
                        echo $TOKEN | docker login -u $REGISTRY --password-stdin
                        docker push $REGISTRY/$APP_NAME:$VERSION
                        docker push $REGISTRY/$APP_NAME:latest
                        docker push $REGISTRY/$APP_NAME:stable
                    """
                }
            }
        }

        /* ---------------------------
           PART 3 — CD PIPELINE
           --------------------------- */

        stage('Deploy to Dev') {
            when { expression { params.DEPLOY_ENV == 'dev' } }
            steps {
                sh """
                    docker pull $REGISTRY/$APP_NAME:$VERSION
                    docker stop dev_container || true
                    docker rm dev_container || true
                    docker run -d --name dev_container -p 3000:3000 $REGISTRY/$APP_NAME:$VERSION
                """
            }
        }

        stage('Smoke Tests') {
            when { expression { params.DEPLOY_ENV == 'dev' } }
            steps { sh "curl -f http://localhost:3000/health" }
        }

        stage('Approval for QA') {
            when { expression { params.DEPLOY_ENV == 'qa' } }
            steps {
                timeout(time: 2, unit: 'HOURS') {
                    input message: "Approve Deployment to QA?"
                }
            }
        }

        stage('Deploy to QA') {
            when { expression { params.DEPLOY_ENV == 'qa' } }
            steps {
                sh """
                    docker pull $REGISTRY/$APP_NAME:$VERSION
                    docker stop qa_container || true
                    docker rm qa_container || true
                    docker run -d --name qa_container -p 3001:3000 $REGISTRY/$APP_NAME:$VERSION
                """
            }
        }

        stage('Integration Tests on QA') {
            when { expression { params.DEPLOY_ENV == 'qa' } }
            agent { docker { image 'node:18' args '-u root' } }
            steps {
                sh 'npm install'
                sh 'npm test tests/integration'
            }
        }

        stage('Approval for Prod') {
            when { expression { params.DEPLOY_ENV == 'prod' } }
            steps {
                timeout(time: 2, unit: 'HOURS') {
                    input message: "Approve Deployment to PROD?"
                }
            }
        }

        stage('Deploy to Prod') {
            when { expression { params.DEPLOY_ENV == 'prod' } }
            steps {
                sh """
                    docker pull $REGISTRY/$APP_NAME:$VERSION
                    docker stop prod_container || true
                    docker rm prod_container || true
                    docker run -d --name prod_container -p 80:3000 $REGISTRY/$APP_NAME:$VERSION
                """
            }
        }

        /* ---------------------------
           PART 4 — METRICS LOGGING
           --------------------------- */
        stage('Log Metrics') {
            steps {
                sh """
                    echo "BUILD=${BUILD_NUMBER}, VERSION=${VERSION}, STATUS=${currentBuild.currentResult}, TIME=$(date)" \
                    >> pipeline_metrics.log
                """
            }
        }
    }

    /* ---------------------------
       POST ACTIONS
       --------------------------- */
    post {

        failure {
            echo "Deployment failed! Rolling back to stable version..."
            sh """
                docker pull $REGISTRY/$APP_NAME:stable
                docker stop prod_container || true
                docker rm prod_container || true
                docker run -d --name prod_container -p 80:3000 $REGISTRY/$APP_NAME:stable
            """
        }

        always {
            emailext(
                to: "abidhurais16@gmail.com",
                subject: "CI/CD Pipeline: ${currentBuild.currentResult}",
                body: """
                Pipeline Completed  
                Version: ${VERSION}  
                Status: ${currentBuild.currentResult}  
                Environment: ${params.DEPLOY_ENV}
                """,
                mimeType: "text/html"
            )
        }
    }
}
