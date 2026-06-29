pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "santoudllo54242/tasklist-backend:${BUILD_NUMBER}"
    }

    stages {

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Generate Prisma Client') {
            steps {
                sh 'npm run prisma:generate'
            }
        }

        stage('Unit Tests + Coverage') {
            steps {
                sh 'npm run test:coverage'
            }

            post {
                always {
                    junit 'reports/junit.xml'
                    archiveArtifacts artifacts: 'coverage/**', fingerprint: true
                }
            }
        }

        stage('End-to-End Tests') {
            steps {
                sh 'npm run test:e2e'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {

                    def scannerHome = tool 'SonarScanner'

                    withSonarQubeEnv('sonarqube-server-1') {

                        withCredentials([
                            string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')
                        ]) {

                            sh """
                                ${scannerHome}/bin/sonar-scanner \
                                  -Dsonar.token=${SONAR_TOKEN}
                            """

                        }
                    }
                }
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
                    docker build \
                        -t ${DOCKER_IMAGE} .
                """
            }
        }

        stage('Trivy Scan') {
            steps {

                sh """
                    trivy image \
                        --severity HIGH,CRITICAL \
                        --format table \
                        ${DOCKER_IMAGE}
                """

                sh """
                    trivy image \
                        --exit-code 0 \
                        --severity HIGH,CRITICAL \
                        --format json \
                        --output trivy-report.json \
                        ${DOCKER_IMAGE}
                """
            }

            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', fingerprint: true
                }
            }
        }

        stage('Generate SBOM') {
            steps {

                sh """
                    trivy image \
                        --format cyclonedx \
                        --output sbom-cyclonedx.json \
                        ${DOCKER_IMAGE}

                    trivy image \
                        --format spdx-json \
                        --output sbom-spdx.json \
                        ${DOCKER_IMAGE}
                """
            }

            post {
                always {
                    archiveArtifacts artifacts: 'sbom-*.json', fingerprint: true
                }
            }
        }

        stage('Push Docker Image') {

            environment {
                DOCKER = credentials('santoudllo-dockerhub-password')
            }

            steps {

                sh """
                    echo ${DOCKER_PSW} | docker login \
                        -u ${DOCKER_USR} \
                        --password-stdin

                    docker push ${DOCKER_IMAGE}

                    docker logout
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