pipeline {
    agent none

    environment {
        REGISTRY = 'hurais16'
        APP_NAME = 'jenkins'
        VERSION = "${env.BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Test in Node Container') {
            agent {
                docker {
                    image 'node:18'
                    args '-u root:root'
                }
            }
            stages {

                stage('Checkout Inside Container') {
                    steps {
                        // Checkout AGAIN inside container so repo exists inside it.
                        checkout scm
                    }
                }

                stage('Install Dependencies') {
                    steps {
                        sh 'npm install'
                    }
                }

                stage('Unit Tests') {
                    steps {
                        sh 'npm test -- --runTestsByPath tests/unit'
                    }
                }

                stage('Integration Tests') {
                    steps {
                        sh 'npm test -- --runTestsByPath tests/integration'
                    }
                }

                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
            }
        }

        stage('Build Docker Image') {
            agent { label 'master' }
            steps {
                sh """
                    docker build -t $REGISTRY/$APP_NAME:$VERSION .
                    docker tag $REGISTRY/$APP_NAME:$VERSION $REGISTRY/$APP_NAME:latest
                """
            }
        }

        stage('Push to DockerHub') {
            agent { label 'master' }
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

