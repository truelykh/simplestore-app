// ==============================================================================
// Pipeline: user-service (Feature Branch Push -> Dev Environment)
// Target Environment: DEV (Namespace: dev)
// ==============================================================================
pipeline {
    agent any

    environment {
        SERVICE_NAME    = 'user-service'
        NEXUS_REGISTRY  = 'nexus-svc.nexus.svc.cluster.local:8082'
        NEXUS_MAVEN_URL = 'http://nexus-svc.nexus.svc.cluster.local:8081/repository/maven-snapshots'
        NEXUS_CRED_ID   = 'nexus-credentials'
        KUBE_NAMESPACE  = 'dev'
        APP_VERSION     = "dev-${BUILD_NUMBER}" // Incremental tag - NO latest tag
    }

    stages {
        stage('Compile & Test') {
            steps {
                dir("features/${SERVICE_NAME}") {
                    echo "Building ${SERVICE_NAME} with Maven..."
                    sh 'mvn clean package -DskipTests=false'
                }
            }
        }

        stage('Upload Snapshot JAR to Nexus') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.NEXUS_CRED_ID, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    echo "Uploading ${SERVICE_NAME} JAR (v${APP_VERSION}) to Nexus Maven..."
                    sh """
                        curl -u ${NEXUS_USER}:${NEXUS_PASS} \
                             --upload-file features/${SERVICE_NAME}/target/app.jar \
                             ${NEXUS_MAVEN_URL}/com/simplestore/${SERVICE_NAME}/${APP_VERSION}/${SERVICE_NAME}-${APP_VERSION}.jar
                    """
                }
            }
        }

        stage('Build & Push Docker Image to Nexus') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.NEXUS_CRED_ID, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    sh "echo ${NEXUS_PASS} | docker login -u ${NEXUS_USER} --password-stdin ${NEXUS_REGISTRY}"
                    
                    dir("features/${SERVICE_NAME}") {
                        def imageName = "${NEXUS_REGISTRY}/${SERVICE_NAME}:${APP_VERSION}"
                        echo "Building and pushing image: ${imageName}"
                        sh "docker build -t ${imageName} ."
                        sh "docker push ${imageName}"
                    }
                }
            }
        }

        stage('Deploy to DEV Kubernetes') {
            steps {
                script {
                    def manifest = "kubernetes/microservices/${SERVICE_NAME}/deployment.yaml"
                    def fullImage = "${NEXUS_REGISTRY}/${SERVICE_NAME}:${APP_VERSION}"
                    
                    echo "Deploying to DEV environment (Namespace: ${KUBE_NAMESPACE}) using image: ${fullImage}"
                    sh """
                        sed -i.bak 's|image: .*|image: ${fullImage}|g' ${manifest}
                        kubectl apply -f ${manifest} -n ${KUBE_NAMESPACE}
                        kubectl rollout status deployment/${SERVICE_NAME} -n ${KUBE_NAMESPACE} --timeout=120s
                    """
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
