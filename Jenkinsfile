pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "santoudllo54242/tasklist-backend:${BUILD_NUMBER}"
        SONAR_HOST_URL = "https://sonarqube.cicd.kits.ext.educentre.fr"
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Repository cloned successfully'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Generate Prisma Client') {
            steps {
                sh 'npx prisma generate'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm run test'
            }
        }

        stage('Publish Test Reports') {
            steps {
                junit 'reports/junit.xml'
            }
        }

        stage('End-to-End Tests') {
            steps {
                sh 'npm run test:e2e'
            }
        }

        stage('SonarQube Analysis') {
            environment {
                SONAR_TOKEN = credentials('sonar-token')
            }
            steps {
                sh """
                sonar-scanner \
                  -Dsonar.host.url=${SONAR_HOST_URL} \
                  -Dsonar.token=${SONAR_TOKEN}
                """
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                docker buildx build \
                    --platform linux/amd64 \
                    --tag ${DOCKER_IMAGE} \
                    --load .
                """
            }
        }

        stage('Trivy Scan') {
            steps {
                sh """
                trivy image \
                  --exit-code 1 \
                  --severity HIGH,CRITICAL \
                  --format json \
                  --output trivy-report.json \
                  ${DOCKER_IMAGE}
                """
            }
        }

        stage('Archive Trivy Report') {
            steps {
                archiveArtifacts artifacts: 'trivy-report.json', fingerprint: true
            }
        }

        stage('Generate SBOM') {
            steps {
                sh """
                trivy image \
                    --format spdx-json \
                    --output sbom-spdx.json \
                    ${DOCKER_IMAGE}

                trivy image \
                    --format cyclonedx \
                    --output sbom-cyclonedx.json \
                    ${DOCKER_IMAGE}
                """
            }
        }

        stage('Archive SBOM') {
            steps {
                archiveArtifacts artifacts: 'sbom-*.json', fingerprint: true
            }
        }

        stage('Push Docker Image') {
            environment {
                DOCKER_CREDS = credentials('dockerhub-credentials')
            }
            steps {
                sh """
                echo ${DOCKER_CREDS_PSW} | docker login \
                    -u ${DOCKER_CREDS_USR} \
                    --password-stdin

                docker push ${DOCKER_IMAGE}
                """
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}