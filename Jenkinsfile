pipeline {
    agent any

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

    }
}