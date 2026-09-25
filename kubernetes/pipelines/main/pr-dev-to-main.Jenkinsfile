// ==============================================================================
// PR Pipeline: dev -> main branch (Production Release)
// Trigger: Pull Request raised to 'main' from 'dev' branch
// ==============================================================================
pipeline {
    agent any

    environment {
        NEXUS_REGISTRY   = 'nexus-svc.nexus.svc.cluster.local:8082'
        NEXUS_MAVEN_URL  = 'http://nexus-svc.nexus.svc.cluster.local:8081/repository/maven-releases'
        NEXUS_CRED_ID    = 'nexus-credentials'
        KUBE_NAMESPACE   = 'prod'
        
        // Strict Incremental Release Tagging (NO latest tag)
        APP_VERSION      = "prod-${BUILD_NUMBER}"
    }

    stages {
        // ----------------------------------------------------------------------
        // STAGE 1: Full Build & Test Verification
        // ----------------------------------------------------------------------
        stage('Production Build & Test Verification') {
            parallel {
                stage('User Service') {
                    steps {
                        dir('features/user-service') {
                            sh 'mvn clean package -DskipTests=false --settings ../../kubernetes/pipelines/settings.xml'
                        }
                    }
                }
                stage('Product Service') {
                    steps {
                        dir('features/product-service') {
                            sh 'mvn clean package -DskipTests=false --settings ../../kubernetes/pipelines/settings.xml'
                        }
                    }
                }
                stage('Order Service') {
                    steps {
                        dir('features/order-service') {
                            sh 'mvn clean package -DskipTests=false --settings ../../kubernetes/pipelines/settings.xml'
                        }
                    }
                }
                stage('Payment Service') {
                    steps {
                        dir('features/payment-service') {
                            sh 'mvn clean package -DskipTests=false --settings ../../kubernetes/pipelines/settings.xml'
                        }
                    }
                }
                stage('Notification Service') {
                    steps {
                        dir('features/notification-service') {
                            sh 'mvn clean package -DskipTests=false --settings ../../kubernetes/pipelines/settings.xml'
                        }
                    }
                }
                stage('Frontend App') {
                    steps {
                        dir('features/frontend') {
                            sh 'npm ci'
                            sh 'npm run build'
                        }
                    }
                }
            }
        }

        // ----------------------------------------------------------------------
        // STAGE 2: Publish Official Release JARs to Nexus Maven Releases
        // ----------------------------------------------------------------------
        stage('Publish Release JARs to Nexus') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.NEXUS_CRED_ID, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    script {
                        def services = ['user-service', 'product-service', 'order-service', 'payment-service', 'notification-service']
                        for (service in services) {
                            echo "Publishing official release JAR for ${service} (v${APP_VERSION}) to Nexus..."
                            sh """
                                curl -u ${NEXUS_USER}:${NEXUS_PASS} \
                                     --upload-file features/${service}/target/app.jar \
                                     ${NEXUS_MAVEN_URL}/com/simplestore/${service}/${APP_VERSION}/${service}-${APP_VERSION}.jar
                            """
                        }
                    }
                }
            }
        }

        // ----------------------------------------------------------------------
        // STAGE 3: Build & Push Production Images to Nexus Docker Registry
        // ----------------------------------------------------------------------
        stage('Publish Production Docker Images') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.NEXUS_CRED_ID, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    sh "echo ${NEXUS_PASS} | docker login -u ${NEXUS_USER} --password-stdin ${NEXUS_REGISTRY}"

                    script {
                        def allComponents = ['frontend', 'user-service', 'product-service', 'order-service', 'payment-service', 'notification-service']
                        for (comp in allComponents) {
                            def fullImageName = "${NEXUS_REGISTRY}/${comp}:${APP_VERSION}"
                            echo "Building Production image with incremental tag: ${fullImageName} (NO latest tag)"
                            dir("features/${comp}") {
                                sh "docker build -t ${fullImageName} ."
                                sh "docker push ${fullImageName}"
                            }
                        }
                    }
                }
            }
        }

        // ----------------------------------------------------------------------
        // STAGE 4: Zero-Downtime Production Rolling Update on Kubernetes
        // ----------------------------------------------------------------------
        stage('Production Kubernetes Rolling Update') {
            steps {
                script {
                    echo "Deploying production release ${APP_VERSION} to Kubernetes namespace: ${KUBE_NAMESPACE}"

                    def allComponents = [
                        'frontend': 'frontend',
                        'user-service': 'user-service',
                        'product-service': 'product-service',
                        'order-service': 'order-service',
                        'payment-service': 'payment-service',
                        'notification-service': 'notification-service'
                    ]

                    allComponents.each { folder, deployName ->
                        def manifestPath = "kubernetes/microservices/${folder}/deployment.yaml"
                        def fullImageName = "${NEXUS_REGISTRY}/${folder}:${APP_VERSION}"

                        echo "Rolling update: ${deployName} -> ${fullImageName}"
                        sh """
                            sed -i.bak 's|image: .*|image: ${fullImageName}|g' ${manifestPath}
                            kubectl apply -f ${manifestPath} -n ${KUBE_NAMESPACE}
                            kubectl rollout status deployment/${deployName} -n ${KUBE_NAMESPACE} --timeout=180s
                        """
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
        success {
            echo "Production Release v${APP_VERSION} deployed successfully with zero downtime!"
        }
    }
}
