pipeline {

    agent any

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['dev', 'qa', 'prod'], description: 'Select environment to deploy')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Skip all tests?')
    }

    environment {
        REGISTRY = 'hurais16'
        APP_NAME = 'jenkins'
        VERSION = "1.0.${env.BUILD_NUMBER}"
        STABLE_TAG = "stable"
    }

    stages {

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install Dependencies') {
            agent {
                docker { image 'node:18'; args '-u root' }
            }
            steps { sh 'npm install' }
        }

        stage('Run Tests (Parallel)') {
            when { expression { return !params.SKIP_TESTS } }

            parallel {
                stage('Unit Tests') {
                    agent { docker { image 'node:18'; args '-u root' } }
                    steps { sh 'npm test' }
                }

                stage('Integration Tests') {
                    agent { docker { image 'node:18'; args '-u root' } }
                    steps { sh 'npm test tests/integration' }
                }
            }
        }

        stage('Lint') {
            when { expression { return !params.SKIP_TESTS } }
            agent { docker { image 'node:18'; args '-u root' } }
            steps { sh 'npm run lint' }
        }

        stage('Security Scan') {
            steps {
                sh """
                    npm audit --audit-level=high || true
                    docker scan $REGISTRY/$APP_NAME || true
                """
            }
        }

        stage('Build Image') {
            steps {
                sh """
                    docker build -t $REGISTRY/$APP_NAME:$VERSION .
                    docker tag $REGISTRY/$APP_NAME:$VERSION $REGISTRY/$APP_NAME:latest
                """
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

        stage('Deploy') {
            steps {
                script {
                    if (params.DEPLOY_ENV == "dev") {
                        sh """
                            docker pull $REGISTRY/$APP_NAME:$VERSION
                            docker stop dev_container || true
                            docker rm dev_container || true
                            docker run -d --name dev_container -p 3000:3000 $REGISTRY/$APP_NAME:$VERSION
                        """
                    }
                    if (params.DEPLOY_ENV == "qa") {
                        sh """
                            docker pull $REGISTRY/$APP_NAME:$VERSION
                            docker stop qa_container || true
                            docker rm qa_container || true
                            docker run -d --name qa_container -p 3001:3000 $REGISTRY/$APP_NAME:$VERSION
                        """
                    }
                    if (params.DEPLOY_ENV == "prod") {
                        sh """
                            docker pull $REGISTRY/$APP_NAME:$VERSION
                            docker stop prod_container || true
                            docker rm prod_container || true
                            docker run -d --name prod_container -p 80:3000 $REGISTRY/$APP_NAME:$VERSION
                        """
                    }
                }
            }
        }

        stage('Smoke Tests') {
            when { expression { params.DEPLOY_ENV != 'prod' } }
            steps {
                script {
                    def PORT = params.DEPLOY_ENV == "dev" ? "3000" : "3001"
                    sh "curl -f http://localhost:${PORT}/health"
                }
            }
        }

        stage('Metrics Collection') {
            steps {
                sh """
                    echo "Build Number: $BUILD_NUMBER"
                    echo "Semantic Version: $VERSION"
                    docker image inspect $REGISTRY/$APP_NAME:$VERSION --format='{{.Size}}'
                """
            }
        }
    }

    post {
        failure {
            sh """
                docker pull $REGISTRY/$APP_NAME:$STABLE_TAG
                docker stop prod_container || true
                docker rm prod_container || true
                docker run -d --name prod_container -p 80:3000 $REGISTRY/$APP_NAME:$STABLE_TAG
            """
        }

        always {
            emailext(
                to: "abidhurais16@gmail.com",
                subject: "CI/CD Pipeline Result: ${currentBuild.currentResult}",
                body: """
                    Build Number: ${env.BUILD_NUMBER}
                    Version: ${VERSION}
                    Status: ${currentBuild.currentResult}
                    Deployed to: ${params.DEPLOY_ENV}
                """
            )
        }
    }
}
