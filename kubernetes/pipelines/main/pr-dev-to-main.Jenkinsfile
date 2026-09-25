pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        ENVIRONMENT = 'prod'

        NEXUS_REGISTRY = 'nexus-svc.nexus.svc.cluster.local:8082'
        NEXUS_MAVEN_URL = 'http://nexus-svc.nexus.svc.cluster.local:8081/repository/maven-releases'
        NEXUS_CRED_ID = 'nexus-credentials'

        KUBE_NAMESPACE = 'prod'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Production Build & Test') {
            parallel {

                stage('User Service') {
                    steps {
                        dir('features/user-service') {
                            sh 'mvn clean package -DskipTests'
                            sh 'test -f target/app.jar'
                        }
                    }
                }

                stage('Product Service') {
                    steps {
                        dir('features/product-service') {
                            sh 'mvn clean package -DskipTests'
                            sh 'test -f target/app.jar'
                        }
                    }
                }

                stage('Order Service') {
                    steps {
                        dir('features/order-service') {
                            sh 'mvn clean package -DskipTests'
                            sh 'test -f target/app.jar'
                        }
                    }
                }

                stage('Payment Service') {
                    steps {
                        dir('features/payment-service') {
                            sh 'mvn clean package -DskipTests'
                            sh 'test -f target/app.jar'
                        }
                    }
                }

                stage('Notification Service') {
                    steps {
                        dir('features/notification-service') {
                            sh 'mvn clean package -DskipTests'
                            sh 'test -f target/notification-service.war'
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('features/frontend') {
                            sh 'npm ci'
                            sh 'npm run build'
                        }
                    }
                }
            }
        }

        stage('Upload Backend Artifacts to Nexus') {
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
                             --upload-file "$WORKSPACE/features/user-service/target/app.jar" \
                             "$NEXUS_MAVEN_URL/com/simplestore/user-service/$ENVIRONMENT/user-service-$ENVIRONMENT-$BUILD_NUMBER.jar"

                        curl --fail \
                             --show-error \
                             --silent \
                             -u "$NEXUS_USER:$NEXUS_PASS" \
                             --upload-file "$WORKSPACE/features/product-service/target/app.jar" \
                             "$NEXUS_MAVEN_URL/com/simplestore/product-service/$ENVIRONMENT/product-service-$ENVIRONMENT-$BUILD_NUMBER.jar"

                        curl --fail \
                             --show-error \
                             --silent \
                             -u "$NEXUS_USER:$NEXUS_PASS" \
                             --upload-file "$WORKSPACE/features/order-service/target/app.jar" \
                             "$NEXUS_MAVEN_URL/com/simplestore/order-service/$ENVIRONMENT/order-service-$ENVIRONMENT-$BUILD_NUMBER.jar"

                        curl --fail \
                             --show-error \
                             --silent \
                             -u "$NEXUS_USER:$NEXUS_PASS" \
                             --upload-file "$WORKSPACE/features/payment-service/target/app.jar" \
                             "$NEXUS_MAVEN_URL/com/simplestore/payment-service/$ENVIRONMENT/payment-service-$ENVIRONMENT-$BUILD_NUMBER.jar"

                        curl --fail \
                             --show-error \
                             --silent \
                             -u "$NEXUS_USER:$NEXUS_PASS" \
                             --upload-file "$WORKSPACE/features/notification-service/target/notification-service.war" \
                             "$NEXUS_MAVEN_URL/com/simplestore/notification-service/$ENVIRONMENT/notification-service-$ENVIRONMENT-$BUILD_NUMBER.war"
                    '''
                }
            }
        }

        stage('Build & Push Production Images') {
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

                    dir('features/frontend') {
                        sh '''
                            docker build \
                                -t "$NEXUS_REGISTRY/frontend/$ENVIRONMENT:$BUILD_NUMBER" \
                                .

                            docker push \
                                "$NEXUS_REGISTRY/frontend/$ENVIRONMENT:$BUILD_NUMBER"
                        '''
                    }

                    dir('features/user-service') {
                        sh '''
                            docker build \
                                -t "$NEXUS_REGISTRY/user-service/$ENVIRONMENT:$BUILD_NUMBER" \
                                .

                            docker push \
                                "$NEXUS_REGISTRY/user-service/$ENVIRONMENT:$BUILD_NUMBER"
                        '''
                    }

                    dir('features/product-service') {
                        sh '''
                            docker build \
                                -t "$NEXUS_REGISTRY/product-service/$ENVIRONMENT:$BUILD_NUMBER" \
                                .

                            docker push \
                                "$NEXUS_REGISTRY/product-service/$ENVIRONMENT:$BUILD_NUMBER"
                        '''
                    }

                    dir('features/order-service') {
                        sh '''
                            docker build \
                                -t "$NEXUS_REGISTRY/order-service/$ENVIRONMENT:$BUILD_NUMBER" \
                                .

                            docker push \
                                "$NEXUS_REGISTRY/order-service/$ENVIRONMENT:$BUILD_NUMBER"
                        '''
                    }

                    dir('features/payment-service') {
                        sh '''
                            docker build \
                                -t "$NEXUS_REGISTRY/payment-service/$ENVIRONMENT:$BUILD_NUMBER" \
                                .

                            docker push \
                                "$NEXUS_REGISTRY/payment-service/$ENVIRONMENT:$BUILD_NUMBER"
                        '''
                    }

                    dir('features/notification-service') {
                        sh '''
                            docker build \
                                -t "$NEXUS_REGISTRY/notification-service/$ENVIRONMENT:$BUILD_NUMBER" \
                                .

                            docker push \
                                "$NEXUS_REGISTRY/notification-service/$ENVIRONMENT:$BUILD_NUMBER"
                        '''
                    }
                }
            }
        }

        stage('Deploy to PROD') {
            steps {
                script {

                    def components = [
                        'frontend',
                        'user-service',
                        'product-service',
                        'order-service',
                        'payment-service',
                        'notification-service'
                    ]

                    for (component in components) {

                        def manifest = "kubernetes/microservices/${component}/deployment.yaml"
                        def image = "${NEXUS_REGISTRY}/${component}/${ENVIRONMENT}:${BUILD_NUMBER}"

                        echo "Deploying ${component} using ${image}"

                        sh """
                            sed -i.bak \
                                's|image: .*|image: ${image}|g' \
                                ${manifest}

                            kubectl apply \
                                -f ${manifest} \
                                -n ${KUBE_NAMESPACE}

                            kubectl rollout status \
                                deployment/${component} \
                                -n ${KUBE_NAMESPACE} \
                                --timeout=180s
                        """
                    }
                }
            }
        }
    }

    post {

        success {
            slackSend(
                channel: '#devopsupdates',
                color: 'good',
                message: "SUCCESS: Production release completed | Build #${BUILD_NUMBER} | frontend/prod:${BUILD_NUMBER} + backend services deployed to PROD"
            )
        }

        failure {
            slackSend(
                channel: '#devopsupdates',
                color: 'danger',
                message: "FAILED: Production release | Build #${BUILD_NUMBER}"
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