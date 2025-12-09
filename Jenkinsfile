pipeline {

    agent any

    parameters {
        string(name: 'MAJOR', defaultValue: '1', description: 'Major version')
        string(name: 'MINOR', defaultValue: '0', description: 'Minor version')
        choice(name: 'DEPLOY_ENV', choices: ['dev', 'qa', 'prod'], description: 'Select deployment environment')
    }

    environment {
        REGISTRY = 'hurais16'
        APP_NAME = 'jenkins'
        VERSION = "${params.MAJOR}.${params.MINOR}.${env.BUILD_NUMBER}"

        // OpenShift settings — modify namespace to YOUR sandbox project
        OPENSHIFT_NAMESPACE = "openshift-sandbox"
        OPENSHIFT_API = "https://api.sandbox.x8i5.p1.openshiftapps.com:6443"
    }

    stages {

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Dependency Install') {
            agent {
                docker {
                    image 'node:18'
                    args '-u root'
                }
            }
            steps { sh 'npm install' }
        }

        stage('Parallel Testing') {
            parallel {

                stage('Unit Tests') {
                    agent {
                        docker {
                            image 'node:18'
                            args '-u root'
                        }
                    }
                    steps { sh 'npm test' }
                }

                stage('Lint') {
                    agent {
                        docker {
                            image 'node:18'
                            args '-u root'
                        }
                    }
                    steps { sh 'npm run lint' }
                }
            }
        }

        stage('Integration Tests') {
            agent {
                docker {
                    image 'node:18'
                    args '-u root'
                }
            }
            steps { sh 'npm test tests/integration' }
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

        /* ------------------------------------------------------------
           OPENSHIFT DEPLOY — OPTION 1 (NO YAML, using oc new-app)
         ------------------------------------------------------------ */

        stage('Deploy to OpenShift') {
            agent{
                docker{
                    image 'openshift/cli:latest'
                    args '-u root'
                }
            }
            steps {
                withCredentials([string(credentialsId: 'openshift-token', variable: 'OC_TOKEN')]) {

                    sh """
                        echo "Logging into OpenShift..."
                        oc login $OPENSHIFT_API --token=$OC_TOKEN --insecure-skip-tls-verify=true

                        oc project $OPENSHIFT_NAMESPACE

                        echo "Checking if app already exists..."
                        if oc get dc $APP_NAME > /dev/null 2>&1; then
                            echo "App exists. Triggering rollout..."
                            oc set image dc/$APP_NAME $APP_NAME=$REGISTRY/$APP_NAME:$VERSION
                            oc rollout latest dc/$APP_NAME
                        else
                            echo "App does NOT exist. Creating using oc new-app..."
                            oc new-app $REGISTRY/$APP_NAME:$VERSION --name=$APP_NAME
                            oc expose svc/$APP_NAME || true
                        fi
                    """
                }
            }
        }

        stage('Smoke Test (OpenShift Route)') {
            steps {
                script {
                    ROUTE = sh(
                        script: "oc get route ${APP_NAME} -o jsonpath='{.spec.host}'",
                        returnStdout: true
                    ).trim()
                }

                sh "curl -f http://${ROUTE}/health"
            }
        }

        stage('Log Metrics') {
            steps {
                sh """
                    echo "BUILD=${BUILD_NUMBER}, VERSION=${VERSION}, STATUS=${currentBuild.currentResult}, TIME=\$(date)" \
                    >> pipeline_metrics.log
                """
            }
        }
    }

    post {

        failure {
            echo "Deployment failed! Rolling back to STABLE version..."

            withCredentials([string(credentialsId: 'openshift-token', variable: 'OC_TOKEN')]) {
                sh """
                    oc login $OPENSHIFT_API --token=$OC_TOKEN --insecure-skip-tls-verify=true
                    oc project $OPENSHIFT_NAMESPACE

                    oc set image dc/$APP_NAME $APP_NAME=$REGISTRY/$APP_NAME:stable
                    oc rollout latest dc/$APP_NAME
                """
            }
        }

        always {
            emailext(
                to: "abidhurais16@gmail.com",
                subject: "CI/CD Pipeline: ${currentBuild.currentResult}",
                body: """
                Pipeline Completed<br>
                Version: ${VERSION}<br>
                Status: ${currentBuild.currentResult}<br>
                Environment: ${params.DEPLOY_ENV}
                """,
                mimeType: "text/html"
            )
        }
    }
}
