pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        SERVICE_NAME = 'notification-service'
        ENVIRONMENT = 'dev'
        APP_VERSION = "${ENVIRONMENT}-${BUILD_NUMBER}"

        NEXUS_REGISTRY = 'nexus-svc.nexus.svc.cluster.local:8082'
        NEXUS_MAVEN_URL = 'http://nexus-svc.nexus.svc.cluster.local:8081/repository/maven-releases'
        NEXUS_CRED_ID = 'nexus-credentials'

        KUBE_NAMESPACE = 'dev'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Environment') {
            steps {
                sh '''
                    java -version
                    mvn -version
                    docker --version
                    kubectl version --client
                '''
            }
        }

        stage('Build JAR') {
            steps {
                dir("features/${SERVICE_NAME}") {
                    sh 'mvn clean package -DskipTests'
                    sh 'test -f target/app.jar'
                    sh 'ls -lh target/app.jar'
                }
            }
        }

        stage('Upload JAR to Nexus') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: env.NEXUS_CRED_ID,
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASS'
                    )
                ]) {
                    sh '''
                        curl --fail \
                             --show-error \
                             --silent \
                             -u "$NEXUS_USER:$NEXUS_PASS" \
                             --upload-file "$WORKSPACE/features/$SERVICE_NAME/target/app.jar" \
                             "$NEXUS_MAVEN_URL/com/simplestore/$SERVICE_NAME/$ENVIRONMENT/$SERVICE_NAME-$APP_VERSION.jar"
                    '''
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
                                -t "$NEXUS_REGISTRY/$SERVICE_NAME/$ENVIRONMENT:$BUILD_NUMBER" \
                                .

                            docker push \
                                "$NEXUS_REGISTRY/$SERVICE_NAME/$ENVIRONMENT:$BUILD_NUMBER"
                        '''
                    }
                }
            }
        }

        stage('Deploy to DEV') {
            steps {
                script {
                    def podManifest = "features/${SERVICE_NAME}/notification-pod.yaml"
                    def svcManifest = "features/${SERVICE_NAME}/notification-svc.yaml"
                    def image = "${NEXUS_REGISTRY}/${SERVICE_NAME}/${ENVIRONMENT}:${BUILD_NUMBER}"

                    sh """
                        sed -i.bak \
                            's|image: .*|image: ${image}|g' \
                            ${podManifest}

                        kubectl apply \
                            -f ${podManifest} \
                            -n ${KUBE_NAMESPACE}

                        kubectl apply \
                            -f ${svcManifest} \
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
                message: "SUCCESS: ${SERVICE_NAME} | Build #${BUILD_NUMBER} | ${ENVIRONMENT}:${BUILD_NUMBER} | DEV deployment completed"
            )
        }

        failure {
            slackSend(
                channel: '#devopsupdates',
                color: 'danger',
                message: "FAILED: ${SERVICE_NAME} | Build #${BUILD_NUMBER} | DEV"
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