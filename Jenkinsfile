,,pipeline {
    agent any

    environment {
        REGISTRY = 'your-dockerhub-useeeername'
        APP_NAME = 'your-app'
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

    post {
        success {
            mail to: 'team@company.com',
                 subject: "Build Successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: "The build completed successfully."
        }
        failure {
            mail to: 'team@company.com',
                 subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: "The build failed."
        }
    }
}
