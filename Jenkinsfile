pipeline {

    agent any

    environment {
        REGISTRY = 'hurais16'
        APP_NAME = 'jenkins'
        VERSION = "${env.BUILD_NUMBER}"
    }

    stages {

        /* -----------------------------------------------------
         *                  CI PIPELINE
         * ----------------------------------------------------- */

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install Dependencies') {
            agent {
                docker {
                    image 'node:18'
                    args '-u root'
                }
            }
            steps {
                sh 'npm install'
            }
        }

        stage('Unit Tests') {
            agent {
                docker {
                    image 'node:18'
                    args '-u root'
                }
            }
            steps {
                sh 'npm test'
            }
        }

        stage('Integration Tests') {
            agent {
                docker {
                    image 'node:18'
                    args '-u root'
                }
            }
            steps {
                sh 'npm test tests/integration'
            }
        }

        stage('Lint') {
            agent {
                docker {
                    image 'node:18'
                    args '-u root'
                }
            }
            steps {
                sh 'npm run lint'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t $REGISTRY/$APP_NAME:$VERSION ."
                sh "docker tag $REGISTRY/$APP_NAME:$VERSION $REGISTRY/$APP_NAME:latest"
            }
        }

        stage('Push') {
            steps {
                withCredentials([string(credentialsId: 'dockerhub-token', variable: 'TOKEN')]) {
                    sh """
                        echo $TOKEN | docker login -u $REGISTRY --password-stdin
                        docker push $REGISTRY/$APP_NAME:$VERSION
                        docker push $REGISTRY/$APP_NAME:latest
                    """
                }
            }
        }

        /* -----------------------------------------------------
         *                  CD PIPELINE
         * ----------------------------------------------------- */

        stage('Deploy to Dev') {
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
            steps {
                sh "curl -f http://localhost:3000/health || exit 1"
            }
        }

        stage('Approval for QA') {
            steps {
                timeout(time: 2, unit: 'HOURS') {
                    input message: "Approve Deployment to QA?"
                }
            }
        }

        stage('Deploy to QA') {
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
            steps {
                sh 'npm test tests/integration'
            }
        }

        stage('Approval for Prod') {
            steps {
                timeout(time: 2, unit: 'HOURS') {
                    input message: "Approve Deployment to PROD?"
                }
            }
        }

        stage('Deploy to Prod') {
            steps {
                sh """
                    docker pull $REGISTRY/$APP_NAME:$VERSION
                    docker stop prod_container || true
                    docker rm prod_container || true
                    docker run -d --name prod_container -p 80:3000 $REGISTRY/$APP_NAME:$VERSION
                """
            }
        }

    }

    /* -----------------------------------------------------
     *                  POST ACTIONS
     * ----------------------------------------------------- */

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
                to: "team@company.com",
                subject: "CI/CD Pipeline: ${currentBuild.currentResult}",
                body: "Build & deployment with version ${VERSION} completed with status: ${currentBuild.currentResult}"
            )
        }
    }
}
