# CI/CD Pipeline Architecture & Jenkins Pipeline Catalog

This directory contains dedicated, decoupled Jenkins pipelines structured strictly by branch trigger, deployment target, and **Tomcat** runtime deployment.

---

## Directory & Pipeline Layout

```text
kubernetes/pipelines/
├── microservices/                                # 1. FEATURE BRANCH PUSH PIPELINES (Deploy to DEV)
│   ├── frontend.Jenkinsfile                      # Trigger: push on feature/frontend-app -> DEV
│   ├── user-service.Jenkinsfile                  # Trigger: push on feature/user-service -> DEV (Tomcat)
│   ├── product-service.Jenkinsfile               # Trigger: push on feature/product-service -> DEV (Tomcat)
│   ├── order-service.Jenkinsfile                 # Trigger: push on feature/order-service -> DEV (Tomcat)
│   ├── payment-service.Jenkinsfile               # Trigger: push on feature/payment-service -> DEV (Tomcat)
│   └── notification-service.Jenkinsfile          # Trigger: push on feature/notification-service -> DEV (Tomcat)
│
├── dev/                                          # 2. DEV PR PIPELINES (Deploy to QA)
│   ├── pr-frontend-dev.Jenkinsfile               # Trigger: PR from frontend -> QA
│   ├── pr-user-service-dev.Jenkinsfile           # Trigger: PR from user-service -> QA (Tomcat)
│   ├── pr-product-service-dev.Jenkinsfile        # Trigger: PR from product-service -> QA (Tomcat)
│   ├── pr-order-service-dev.Jenkinsfile          # Trigger: PR from order-service -> QA (Tomcat)
│   ├── pr-payment-service-dev.Jenkinsfile        # Trigger: PR from payment-service -> QA (Tomcat)
│   └── pr-notification-service-dev.Jenkinsfile   # Trigger: PR from notification-service -> QA (Tomcat)
│
├── main/                                         # 3. MAIN RELEASE PIPELINE (Deploy to PROD)
│   └── pr-dev-to-main.Jenkinsfile                # Trigger: PR from dev -> main (Production Release)
│
└── settings.xml                                  # Maven settings for internal cluster Nexus
```

---

## Tomcat Microservice Architecture

All Java microservices (`user-service`, `product-service`, `order-service`, `payment-service`, `notification-service`) run in **dedicated Tomcat containers**:

1. **Packaging**:
   - `pom.xml` builds with `<packaging>war</packaging>` and provides Tomcat dependencies.
   - Maven produces `target/app.war`.
2. **Nexus Storage**:
   - Every build publishes the `.war` artifact to Nexus Maven repository (`http://nexus-svc:8081`).
3. **Container Image**:
   - Uses `tomcat:10.1-jdk21-temurin` (Spring Boot 3 uses Jakarta EE 10, requiring Tomcat 10.1+ and Java 21).
   - Deploys `target/app.war` as `/usr/local/tomcat/webapps/ROOT.war` so that context paths map directly to `/api/...`.
4. **Kubernetes Deployment**:
   - Runs as isolated pods inside the target namespace (`dev`, `qa`, or `prod`).
   - Health monitored via `/actuator/health` on port `8080`.

---

## Environment & Pipeline Mapping

| Level | Branch | Target Namespace | Trigger | Image Tag |
| :--- | :--- | :--- | :--- | :--- |
| **Microservice Push** | `feature/*` | **`dev`** | Git Push | `dev-${BUILD_NUMBER}` |
| **QA Integration** | `dev` | **`qa`** | PR to `dev` | `qa-${BUILD_NUMBER}` |
| **Production** | `main` | **`prod`** | PR to `main` | `prod-${BUILD_NUMBER}` |

*Strict rule: No `latest` tag is ever used. Every build creates an incremental, trackable tag.*
