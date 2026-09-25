pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        SERVICE_NAME = 'frontend'
        ENVIRONMENT = 'qa'
        APP_VERSION = "${BUILD_NUMBER}"

        NEXUS_REGISTRY = 'nexus-svc.nexus.svc.cluster.local:8082'
        NEXUS_CRED_ID = 'nexus-credentials'

        KUBE_NAMESPACE = 'qa'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                dir("features/${SERVICE_NAME}") {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: env.NEXUS_CRED_ID,
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASS'
                    )
                ]) {
                    sh '''
                        echo "$NEXUS_PASS" | docker login \
                            "$NEXUS_REGISTRY" \
                            -u "$NEXUS_USER" \
                            --password-stdin
                    '''

                    dir("features/${SERVICE_NAME}") {
                        sh '''
                            docker build \
                                -t "$NEXUS_REGISTRY/$SERVICE_NAME/$ENVIRONMENT:$APP_VERSION" \
                                .

                            docker push \
                                "$NEXUS_REGISTRY/$SERVICE_NAME/$ENVIRONMENT:$APP_VERSION"
                        '''
                    }
                }
            }
        }

        stage('Deploy to QA') {
            steps {
                script {
                    def manifest = "kubernetes/microservices/${SERVICE_NAME}/deployment.yaml"
                    def image = "${NEXUS_REGISTRY}/${SERVICE_NAME}/${ENVIRONMENT}:${APP_VERSION}"

                    sh """
                        sed -i.bak \
                            's|image: .*|image: ${image}|g' \
                            ${manifest}

                        kubectl apply \
                            -f ${manifest} \
                            -n ${KUBE_NAMESPACE}

                        kubectl rollout status \
                            deployment/${SERVICE_NAME} \
                            -n ${KUBE_NAMESPACE} \
                            --timeout=120s
                    """
                }
            }
        }
    }

    post {

        success {
            slackSend(
                channel: '#devopsupdates',
                color: 'good',
                message: "SUCCESS: ${SERVICE_NAME} - Build #${BUILD_NUMBER} - ${ENVIRONMENT}:${APP_VERSION} - QA deployment completed"
            )
        }

        failure {
            slackSend(
                channel: '#devopsupdates',
                color: 'danger',
                message: "FAILED: ${SERVICE_NAME} - Build #${BUILD_NUMBER} - QA"
            )
        }

        always {
            sh 'docker logout ${NEXUS_REGISTRY} || true'
            cleanWs(
                deleteDirs: true,
                notFailBuild: true
            )
        }
    }
}