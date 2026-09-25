pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        SERVICE_NAME = 'frontend'
        ENVIRONMENT = 'dev'
        APP_VERSION = "${BUILD_NUMBER}"

        NEXUS_REGISTRY = 'nexus-svc.nexus.svc.cluster.local:8082'
        NEXUS_CRED_ID = 'nexus-admin-credentials'

        KUBE_NAMESPACE = 'dev'

        POD_MANIFEST = "features/frontend/frontend-pod.yaml"
        SERVICE_MANIFEST = "features/frontend/frontend-svc.yaml"
    }

    stages {

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

        stage('Deploy to DEV') {
            steps {
                script {
                    def image = "${NEXUS_REGISTRY}/${SERVICE_NAME}/${ENVIRONMENT}:${APP_VERSION}"

                    sh """
                        sed -i.bak \
                            's|image: .*|image: ${image}|g' \
                            ${POD_MANIFEST}

                        kubectl apply \
                            -f ${POD_MANIFEST} \
                            -n ${KUBE_NAMESPACE}

                        kubectl apply \
                            -f ${SERVICE_MANIFEST} \
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
                message: "SUCCESS: ${SERVICE_NAME} - Build #${BUILD_NUMBER} - ${ENVIRONMENT}:${APP_VERSION} - DEV deployment completed"
            )
        }

        failure {
            slackSend(
                channel: '#devopsupdates',
                color: 'danger',
                message: "FAILED: ${SERVICE_NAME} - Build #${BUILD_NUMBER} - DEV"
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