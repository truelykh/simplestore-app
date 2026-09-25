# Kubernetes Architecture & Deployment Guide

This directory contains production-grade Kubernetes manifests for the **Simple Store** microservices application and supporting infrastructure.

---

## Directory Structure

```text
kubernetes/
├── cluster/                         # Cluster-level primitives
│   ├── namespace.yaml               # Namespaces (storeapp, nginx, jenkins, nexus, tomcat)
│   └── storage.yaml                 # AWS EBS gp3 StorageClass
├── servers/                         # Supporting CI/CD & Gateway Infrastructure
│   ├── jenkins/                     # Jenkins Master + Docker-in-Docker sidecar
│   ├── nexusrepo/                   # Sonatype Nexus Repository (Maven & Docker Registry)
│   ├── nginx/                       # API Gateway & Reverse Proxy (Routes / to UI, /api/* to services)
│   └── tomcat/                      # Apache Tomcat server
└── microservices/                   # Application Microservices (Deployments & Services)
    ├── frontend/                    # React 19 + Nginx static container (Port 80)
    ├── user-service/                # Spring Boot User Service (Port 8080)
    ├── product-service/             # Spring Boot Product Service (Port 8080)
    ├── order-service/               # Spring Boot Order Service (Port 8080)
    ├── payment-service/             # Spring Boot Payment Service (Port 8080)
    └── notification-service/        # Spring Boot Notification Service (Port 8080)
```

---

## Production Features Included

1. **High Availability**: All microservices run with `replicas: 2` and a zero-downtime `RollingUpdate` deployment strategy (`maxSurge: 1`, `maxUnavailable: 0`).
2. **Health Checks**:
   - Spring Boot services utilize Actuator endpoints (`/actuator/health`) for `livenessProbe` and `readinessProbe`.
   - Frontend and Nginx utilize HTTP probes on port 80.
3. **Resource Bounds**: Every container defines strict CPU and Memory `requests` and `limits` to prevent noisy neighbors and OOM kills.
4. **API Gateway Routing**: Nginx automatically proxies incoming external requests:
   - `/` $\rightarrow$ `frontend-svc.storeapp.svc.cluster.local:80`
   - `/api/users` $\rightarrow$ `user-svc.storeapp.svc.cluster.local:8080`
   - `/api/products` $\rightarrow$ `product-svc.storeapp.svc.cluster.local:8080`
   - `/api/orders` $\rightarrow$ `order-svc.storeapp.svc.cluster.local:8080`
   - `/api/payments` $\rightarrow$ `payment-svc.storeapp.svc.cluster.local:8080`
   - `/api/notifications` $\rightarrow$ `notification-svc.storeapp.svc.cluster.local:8080`

---

## Deployment Instructions

### 1. Initialize Cluster Namespaces & Storage
```bash
kubectl apply -f kubernetes/cluster/namespace.yaml
kubectl apply -f kubernetes/cluster/storage.yaml
```

### 2. Deploy Infrastructure Servers
```bash
kubectl apply -f kubernetes/servers/jenkins/
kubectl apply -f kubernetes/servers/nexusrepo/
kubectl apply -f kubernetes/servers/tomcat/
kubectl apply -f kubernetes/servers/nginx/
```

### 3. Deploy Application Microservices
```bash
kubectl apply -f kubernetes/microservices/frontend/
kubectl apply -f kubernetes/microservices/user-service/
kubectl apply -f kubernetes/microservices/product-service/
kubectl apply -f kubernetes/microservices/order-service/
kubectl apply -f kubernetes/microservices/payment-service/
kubectl apply -f kubernetes/microservices/notification-service/
```

### 4. Verify Deployments
```bash
kubectl get pods -n storeapp
kubectl get svc -n storeapp
kubectl get svc -n nginx
```
Access the application through the Nginx NodePort: `http://<NODE_IP>:30080`.
