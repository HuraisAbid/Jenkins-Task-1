pipeline {

    agent any

    environment {
        REGISTRY = 'hurais16'
        APP_NAME = 'jenkins'
        VERSION = "${env.BUILD_NUMBER}"
    }

    stages {

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
    }
}
