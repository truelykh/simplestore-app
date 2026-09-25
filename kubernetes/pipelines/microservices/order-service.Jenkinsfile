// ==============================================================================
// Pipeline: order-service (Feature Branch Push)
// Trigger: Push on feature/order-service
// ==============================================================================
pipeline {
    agent any

    environment {
        SERVICE_NAME    = 'order-service'
        NEXUS_REGISTRY  = 'nexus-svc.nexus.svc.cluster.local:8082'
        NEXUS_MAVEN_URL = 'http://nexus-svc.nexus.svc.cluster.local:8081/repository/maven-snapshots'
        NEXUS_CRED_ID   = 'nexus-credentials'
        APP_VERSION     = "1.0.${BUILD_NUMBER}" // Incremental tag - NO latest tag
    }

    stages {
        stage('Compile & Test') {
            steps {
                dir("features/${SERVICE_NAME}") {
                    echo "Building ${SERVICE_NAME} with Maven..."
                    sh 'mvn clean package -DskipTests=false --settings ../../kubernetes/pipelines/settings.xml'
                }
            }
        }

        stage('Upload Snapshot JAR to Nexus') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.NEXUS_CRED_ID, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    echo "Uploading ${SERVICE_NAME} JAR (v${APP_VERSION}) to Nexus Maven Snapshots..."
                    sh """
                        curl -u ${NEXUS_USER}:${NEXUS_PASS} \
                             --upload-file features/${SERVICE_NAME}/target/app.jar \
                             ${NEXUS_MAVEN_URL}/com/simplestore/${SERVICE_NAME}/${APP_VERSION}/${SERVICE_NAME}-${APP_VERSION}.jar
                    """
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.NEXUS_CRED_ID, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    sh "echo ${NEXUS_PASS} | docker login -u ${NEXUS_USER} --password-stdin ${NEXUS_REGISTRY}"
                    
                    dir("features/${SERVICE_NAME}") {
                        def imageName = "${NEXUS_REGISTRY}/${SERVICE_NAME}:${APP_VERSION}"
                        echo "Building Docker image with incremental tag: ${imageName}"
                        sh "docker build -t ${imageName} ."
                        sh "docker push ${imageName}"
                    }
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout ${NEXUS_REGISTRY} || true'
            cleanWs notFailBuild: true
        }
    }
}
