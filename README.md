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
6. [Managing the Pipelines & Resources (Run, Pause & Stop)](#managing-the-pipelines--resources-run-pause--stop)
7. [Testing the CI/CD Loop](#testing-the-cicd-loop)
8. [Troubleshooting](#troubleshooting)

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

## ⚙️ Managing the Pipelines & Resources (Run, Pause & Stop)

Here is how you can control your pipelines and running cloud resources.

### 🏃 How to Run the Pipeline
* **Automatically**: Every time you push code changes to the `main` or `develop` branches, the CI/CD pipeline triggers automatically.
* **Manually**: 
  1. Navigate to **Azure DevOps** > **Pipelines**.
  2. Click on your pipeline (e.g. `Space-Defender-CI-Build`).
  3. Click **Run pipeline** in the top right corner.
  4. Select the target branch and click **Run**.

---

### 🛑 How to Stop or Cancel a Running Pipeline
If a build or deployment is currently running and you need to stop it immediately:
1. In **Azure DevOps**, click on the active pipeline run.
2. In the top right corner, click the **Cancel** button.
3. Confirm the cancellation. The pipeline agent will terminate the current step and release resources.

---

### ⏸️ How to Pause or Disable Pipeline Triggers (Deactivate Triggers)
If you want to prevent the pipelines from triggering automatically when code is pushed:
* **To Pause**: 
  1. Go to **Pipelines** in Azure DevOps.
  2. Click the three dots (`...`) next to your pipeline.
  3. Select **Pause pipeline**. Runs will be queued but won't start until resumed.
* **To Disable**:
  1. Click the three dots (`...`) next to the pipeline.
  2. Select **Settings** (or **Pause/Disable** options depending on your UI version).
  3. Toggle/set status to **Disabled**. This prevents any runs from being triggered or queued.

---

### 💤 Deactivating Hosting Resources (To Avoid Costs / Overnight Pause)
Since running cloud services continuously costs money, use these steps to deactivate them temporarily:

#### Option A: For Azure App Service (Web App)
* **To Deactivate**:
  * Stop the App Service:
    ```bash
    az webapp stop --name space-defender-webapp --resource-group EA-SpaceDefender-RG
    ```
  * *Scale down App Service Plan to the Free tier* (to stop host VM charges):
    ```bash
    az appservice plan update --name <Your-App-Service-Plan-Name> --resource-group EA-SpaceDefender-RG --sku F1
    ```
* **To Relaunch**:
  * Scale plan back up to your target tier (e.g. `B1`), then start the app:
    ```bash
    az webapp start --name space-defender-webapp --resource-group EA-SpaceDefender-RG
    ```

#### Option B: For Azure Container Apps
* **To Deactivate (Scale to 0)**:
  * In the Azure Portal, go to your Container App (`space-defender-app`) > **Scale** > Edit and set min/max replicas to `0`. 
  * Or, go to **Revision Management**, select the active revision, and click **Deactivate**.
* **To Relaunch**:
  * In **Revision Management**, select the revision and click **Activate** (or restore scale minimum replicas to `1`).

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
