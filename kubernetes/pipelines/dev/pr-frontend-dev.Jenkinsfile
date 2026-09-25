// ==============================================================================
// PR Pipeline: frontend -> dev branch (QA Environment)
// Target Environment: QA (Namespace: qa)
// ==============================================================================
pipeline {
    agent any

    environment {
        SERVICE_NAME    = 'frontend'
        NEXUS_REGISTRY  = 'nexus-svc.nexus.svc.cluster.local:8082'
        NEXUS_CRED_ID   = 'nexus-credentials'
        KUBE_NAMESPACE  = 'qa'
        APP_VERSION     = "qa-${BUILD_NUMBER}" // Incremental tag - NO latest tag
    }

    stages {
        stage('PR Validation: Install & Build') {
            steps {
                dir("features/${SERVICE_NAME}") {
                    echo "Building ${SERVICE_NAME} React app..."
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Publish Image to Nexus Docker Registry') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.NEXUS_CRED_ID, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    sh "echo ${NEXUS_PASS} | docker login -u ${NEXUS_USER} --password-stdin ${NEXUS_REGISTRY}"
                    
                    dir("features/${SERVICE_NAME}") {
                        def imageName = "${NEXUS_REGISTRY}/${SERVICE_NAME}:${APP_VERSION}"
                        echo "Building and pushing Docker image with incremental tag: ${imageName}"
                        sh "docker build -t ${imageName} ."
                        sh "docker push ${imageName}"
                    }
                }
            }
        }

        stage('Deploy to QA Kubernetes') {
            steps {
                script {
                    def manifest = "kubernetes/microservices/${SERVICE_NAME}/deployment.yaml"
                    def fullImage = "${NEXUS_REGISTRY}/${SERVICE_NAME}:${APP_VERSION}"
                    
                    echo "Deploying ${SERVICE_NAME} to QA namespace using image: ${fullImage}"
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
