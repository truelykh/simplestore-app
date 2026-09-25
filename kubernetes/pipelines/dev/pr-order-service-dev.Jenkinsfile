// ==============================================================================
// PR Pipeline: order-service -> dev branch
// Trigger: Pull Request raised to 'dev' from feature/order-service
// ==============================================================================
pipeline {
    agent any

    environment {
        SERVICE_NAME    = 'order-service'
        NEXUS_REGISTRY  = 'nexus-svc.nexus.svc.cluster.local:8082'
        NEXUS_MAVEN_URL = 'http://nexus-svc.nexus.svc.cluster.local:8081/repository/maven-snapshots'
        NEXUS_CRED_ID   = 'nexus-credentials'
        KUBE_NAMESPACE  = 'storeapp'
        APP_VERSION     = "1.0.${BUILD_NUMBER}" // Incremental tag - NO latest tag
    }

    stages {
        stage('PR Validation: Test & Package') {
            steps {
                dir("features/${SERVICE_NAME}") {
                    echo "Validating PR to dev for ${SERVICE_NAME}..."
                    sh 'mvn clean package -DskipTests=false --settings ../../kubernetes/pipelines/settings.xml'
                }
            }
        }

        stage('Publish JAR to Nexus') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.NEXUS_CRED_ID, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    echo "Publishing ${SERVICE_NAME} JAR (v${APP_VERSION}) to Nexus..."
                    sh """
                        curl -u ${NEXUS_USER}:${NEXUS_PASS} \
                             --upload-file features/${SERVICE_NAME}/target/app.jar \
                             ${NEXUS_MAVEN_URL}/com/simplestore/${SERVICE_NAME}/${APP_VERSION}/${SERVICE_NAME}-${APP_VERSION}.jar
                    """
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

        stage('Deploy to Dev Kubernetes') {
            steps {
                script {
                    def manifest = "kubernetes/microservices/${SERVICE_NAME}/deployment.yaml"
                    def fullImage = "${NEXUS_REGISTRY}/${SERVICE_NAME}:${APP_VERSION}"
                    
                    echo "Deploying ${SERVICE_NAME} to Dev namespace using image: ${fullImage}"
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
