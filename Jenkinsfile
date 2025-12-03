pipeline {
    agent {
        docker {
            image 'node:18'
            args '-u root:root'   
        }
    }

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

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build -t $REGISTRY/$APP_NAME:$VERSION .
                    docker tag $REGISTRY/$APP_NAME:$VERSION $REGISTRY/$APP_NAME:latest
                """
            }
        }

        stage('Push to DockerHub') {
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
