# 🎮 Space Defender – Azure DevOps End-to-End CI/CD Project

> **Course-End Project 1 | Electronic Arts Gaming Application**  
> Hosted on Azure App Service via Azure DevOps CI/CD Pipelines

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
5. [Pipeline Configuration](#pipeline-configuration)
6. [Testing the CI/CD Loop](#testing-the-cicd-loop)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Project Overview

This project deploys a fully functional **HTML5 Space Defender arcade game** to **Azure App Service** using a complete **Azure DevOps CI/CD pipeline**:

| Component | Technology |
|---|---|
| Application | HTML5 + Canvas + JavaScript |
| Web Server | Nginx (inside Docker) |
| Container Registry | Azure Container Registry (ACR) |
| CI Pipeline | Azure DevOps Build Pipeline |
| CD Pipeline | Azure DevOps Release Pipeline |
| Hosting | Azure App Service (Web App for Containers) |
| Source Control | GitHub |

---

## 🏗️ Architecture

```
Developer (VS Code)
       │
       │  git push
       ▼
  ┌──────────┐
  │  GitHub  │  (Source Repository)
  └────┬─────┘
       │  Triggers
       ▼
  ┌──────────────────────┐
  │  Azure DevOps        │
  │  CI Build Pipeline   │  ← azure-pipelines.yml
  │                      │
  │  1. Checkout code    │
  │  2. docker build     │
  │  3. docker push      │
  └────┬─────────────────┘
       │  Pushes image
       ▼
  ┌──────────────────────┐
  │  Azure Container     │
  │  Registry (ACR)      │  ← space-defender:latest
  └────┬─────────────────┘
       │  Triggers automatically
       ▼
  ┌──────────────────────┐
  │  Azure DevOps        │
  │  CD Release Pipeline │  ← release-pipeline.yml
  │                      │
  │  1. Validate image   │
  │  2. Deploy container │
  │  3. Smoke test       │
  └────┬─────────────────┘
       │  Deploys
       ▼
  ┌──────────────────────┐
  │  Azure App Service   │
  │  (Web App for        │  ← https://your-app.azurewebsites.net
  │   Containers)        │
  └──────────────────────┘
       │  Serves
       ▼
  🌐 Users play the game in their browser!
```

---

## 📁 Project Structure

```
PL Project 1/
├── app/
│   ├── index.html          ← Game UI (hero, canvas, leaderboard, about)
│   ├── style.css           ← Glassmorphism dark-mode styling
│   └── game.js             ← Canvas-based Space Defender game engine
├── Dockerfile              ← nginx:alpine + app files
├── nginx.conf              ← Nginx server config with security headers
├── azure-pipelines.yml     ← CI: Build Docker image → Push to ACR
├── release-pipeline.yml    ← CD: Pull from ACR → Deploy to App Service
└── README.md               ← This file
```

---

## 🛠️ Step-by-Step Setup Guide

### PHASE 1 – Azure Portal Setup

#### Step 1: Create a Resource Group
```
Azure Portal → Resource Groups → + Create
  Name:     EA-SpaceDefender-RG
  Region:   East US (or nearest)
```

#### Step 2: Create Azure Container Registry (ACR)
```
Azure Portal → Container Registries → + Create
  Resource Group:  EA-SpaceDefender-RG
  Registry Name:   easpacegameacr        ← must be globally unique
  SKU:             Basic
  
After creation:
  → Settings → Access keys → Enable Admin user ✓
  → Note down: Login server, Username, Password
```

#### Step 3: Create Azure App Service
```
Azure Portal → App Services → + Create
  Resource Group:   EA-SpaceDefender-RG
  Name:             space-defender-webapp  ← must be globally unique
  Publish:          Docker Container       ← IMPORTANT
  OS:               Linux
  Region:           East US
  Plan:             Free F1 (or Basic B1)

→ Docker tab:
  Options:         Single Container
  Image Source:    Azure Container Registry
  Registry:        easpacegameacr
  Image:           space-defender
  Tag:             latest
```

---

### PHASE 2 – Azure DevOps Setup

#### Step 4: Create Azure DevOps Organization & Project
```
https://dev.azure.com → + New Organization
  Organization Name: ea-gaming-devops

→ + New Project
  Name:       SpaceDefender
  Visibility: Private
```

#### Step 5: Connect GitHub Repository
```
Project Settings → Service Connections → + New Service Connection
  Type: GitHub
  → OAuth or PAT authentication
  Name: GitHub-ServiceConnection
```

#### Step 6: Connect Azure Container Registry
```
Project Settings → Service Connections → + New Service Connection
  Type: Docker Registry
  Registry type: Azure Container Registry
  Subscription: (your Azure subscription)
  ACR:  easpacegameacr
  Name: ACR-ServiceConnection          ← matches azure-pipelines.yml
```

#### Step 7: Connect Azure Subscription (for App Service deployment)
```
Project Settings → Service Connections → + New Service Connection
  Type: Azure Resource Manager
  Authentication: Service Principal (automatic)
  Subscription: (your Azure subscription)
  Resource Group: EA-SpaceDefender-RG
  Name: Azure-ServiceConnection        ← matches release-pipeline.yml
```

#### Step 8: Request Parallelism (if needed)
```
If CI/CD jobs are queued and not running:
  → Go to: https://aka.ms/azpipelines-parallelism-request
  → Fill form for free parallelism grant (takes 1-3 business days)
```

---

### PHASE 3 – Pipeline Setup

#### Step 9: Create CI Build Pipeline
```
Azure DevOps → Pipelines → + New Pipeline
  Where is your code? → GitHub
  Select repository:  → your-repo/space-defender
  Configure:          → Existing Azure Pipelines YAML file
  Path:               → /azure-pipelines.yml

Before saving, edit these values in azure-pipelines.yml:
  acrName:    'easpacegameacr'         ← your ACR name
  dockerRegistryServiceConnection: 'ACR-ServiceConnection'

→ Save and Run
```

#### Step 10: Create CD Release Pipeline
```
Azure DevOps → Pipelines → + New Pipeline
  Where is your code? → GitHub
  Select repository:  → your-repo/space-defender
  Configure:          → Existing Azure Pipelines YAML file
  Path:               → /release-pipeline.yml

Before saving, edit these values in release-pipeline.yml:
  acrName:           'easpacegameacr'
  appServiceName:    'space-defender-webapp'
  resourceGroup:     'EA-SpaceDefender-RG'
  azureServiceConnection:   'Azure-ServiceConnection'
  dockerRegistryServiceConnection: 'ACR-ServiceConnection'
  source: 'Space-Defender-CI-Build'   ← exact name of your CI pipeline

→ Save (do not run manually – it triggers from CI)
```

---

## 🔁 Testing the CI/CD Loop

Once everything is set up, test the full pipeline with a code change:

```bash
# Clone the repository
git clone https://github.com/your-username/space-defender.git
cd space-defender

# Make a visible change (e.g., update hero title in index.html)
# Then commit and push:
git add .
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

**What happens automatically:**
1. ✅ GitHub push → triggers **CI Build Pipeline**
2. ✅ Docker image built with new `Build.BuildId` tag
3. ✅ Image pushed to ACR as `:latest` and `:<build-id>`
4. ✅ CI publishes artifact → triggers **CD Release Pipeline**
5. ✅ CD validates image in ACR
6. ✅ New container deployed to Azure App Service
7. ✅ Smoke test verifies the app is live
8. ✅ Game is updated at `https://space-defender-webapp.azurewebsites.net`

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| Pipeline stuck in queue | Request parallelism at aka.ms/azpipelines-parallelism-request |
| Docker push failed | Verify ACR admin access is enabled & service connection is correct |
| App Service shows old container | Restart App Service manually in Azure Portal |
| 503 error on App Service | Wait 2-3 mins for cold start; check container logs in App Service |
| Smoke test fails with 000 | DNS propagation delay – wait and retry |
| ACR image not found | Check CI pipeline ran successfully and pushed the image |

---

## 🏆 Project Checklist

- [x] Resource Group created
- [x] Azure Container Registry created
- [x] App Service (Web App for Containers) created
- [x] Azure DevOps Organization & Project created
- [x] GitHub service connection configured
- [x] ACR service connection configured
- [x] Azure subscription service connection configured
- [x] CI Build Pipeline created & tested
- [x] CD Release Pipeline created & tested
- [x] Full CI/CD loop verified with a test commit
- [x] Gaming application accessible in web browser

---

*© 2026 Electronic Arts Inc. | Azure DevOps Course-End Project 1*
