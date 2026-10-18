# Bebsayik.com — Windows 10 & WSL2 Docker Desktop Setup Guide

**Target Environment:** Local Windows Development Host for Bebsayik Staging Deployment  
**Operating System:** Microsoft Windows 10 Pro (64-bit, Version 22H2, Build 19045)  
**Hardware Profile:** Intel Core i5-10210U (4 Cores / 8 Threads), 8 GB RAM, 82+ GB Free Disk  
**Date:** October 17, 2026  
**Document Safety Constraint:** Informational Setup Guide Only — No system settings modified or software installed without user approval  

---

## 1. System Compatibility & Pre-Installation Audit

A non-destructive pre-installation audit of the Windows development machine was executed:

| Requirement Component | Official Docker / WSL2 Requirement | Current System Value | Compatibility Status |
| :--- | :--- | :--- | :---: |
| **Operating System** | Windows 10 64-bit: Pro 21H2+ (Build 19044+) | Windows 10 Pro Build 19045 (22H2) | **PASS (Fully Supported)** |
| **CPU Architecture** | 64-bit with SLAT (Second Level Address Translation) | Intel Core i5-10210U (x64) | **PASS (Fully Supported)** |
| **BIOS Virtualization** | Intel VT-x or AMD-V enabled in firmware | `VirtualizationFirmwareEnabled: True` | **PASS (Already Active)** |
| **Physical RAM** | Minimum 4 GB, Recommended 8 GB+ | 8.00 GB Physical RAM | **PASS (Meets Requirement)** |
| **Free Storage Space** | Minimum 20 GB free space on system drive | 82.69 GB Free Space on `C:` Drive | **PASS (Meets Requirement)** |
| **WSL Subsystem** | WSL 2 Kernel & Virtual Machine Platform | `wsl.exe` available; features uninitialized | **REQUIRES INITIALIZATION** |
| **Docker Engine** | Docker Desktop 4.35+ with WSL 2 backend | Not installed in `PATH` | **READY FOR INSTALLATION** |

---

## 2. Resource Management for 8 GB RAM Systems (`.wslconfig`)

Because the host has 8 GB of physical RAM, Windows and Docker must share memory gracefully to avoid system paging or freezing when compiling Vite frontends or running MongoDB connections.

### Create `%USERPROFILE%\.wslconfig`
Create a file named `.wslconfig` in your user home directory (`C:\Users\conta\.wslconfig`) with the following content:

```ini
[wsl2]
# Restrict WSL2 VM memory to 4GB so Windows host retains 4GB for IDE and dev tools
memory=4GB

# Limit virtual processors to 4 (matching physical cores)
processors=4

# Configure 2GB swap space on NVMe/SSD
swap=2GB

# Automatically release cached memory back to Windows
autoMemoryReclaim=gradual
```

This ensures WSL2 and Docker never exceed 4 GB of RAM, preserving 4 GB for Windows OS, Antigravity IDE, browser tabs, and Node.js dev servers.

---

## 3. Step-by-Step Installation Procedures

Follow these steps using an **Elevated PowerShell Window** (*Right-click PowerShell -> Run as Administrator*).

### Method A: Automated Installation via Windows Package Manager (Recommended)

#### Step 1: Initialize WSL 2 and Virtual Machine Platform
Run the following command to enable WSL 2 and install the Linux kernel:
```powershell
# Installs WSL and downloads the default Ubuntu distribution
wsl --install --no-launch
```
*Note: If prompted to reboot after this command, restart your PC before proceeding to Step 2.*

#### Step 2: Set WSL Default Version to 2 and Update Kernel
```powershell
# Ensure WSL2 is the default architecture
wsl --set-default-version 2

# Update the WSL2 Linux kernel to latest release
wsl --update
```

#### Step 3: Install Docker Desktop via `winget`
```powershell
# Automatically downloads and executes the official Docker Desktop installer
winget install -e --id Docker.DockerDesktop
```

---

### Method B: Manual Installer via Web Browser (Alternative)

If you prefer installing via GUI executable:
1. Download the official installer:  
   **URL:** `https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe`
2. Right-click `Docker Desktop Installer.exe` and select **Run as administrator**.
3. In the setup wizard:
   - Ensure **"Use WSL 2 instead of Hyper-V (recommended)"** is **checked**.
   - Check **"Add shortcut to desktop"** if desired.
4. Click **OK** to install.
5. When prompted, click **Restart** to complete system configuration.

---

## 4. Post-Installation Docker Desktop Configuration

After the system restarts:

1. Launch **Docker Desktop** from the Start Menu.
2. Accept the Docker Subscription Service Agreement.
3. In Docker Desktop, open **Settings** (Gear Icon in top toolbar):
   - Under **General**:
     - Ensure **"Use the WSL 2 based engine"** is checked.
     - Optional: Uncheck **"Start Docker Desktop when you sign in"** to preserve RAM during daily development until staging tests are needed.
   - Under **Resources -> WSL Integration**:
     - Ensure **"Enable integration with my default WSL distro"** is checked.
4. Click **Apply & restart**.

---

## 5. Verification Commands

Open a standard (non-elevated) PowerShell or Terminal window and execute the following commands to verify that Docker is operational:

### 1. Verify WSL2 Status
```powershell
wsl --status
# Expected: Default Version: 2
```

### 2. Verify Docker CLI and Compose Versions
```powershell
docker --version
# Expected: Docker version 27.x.x or higher

docker compose version
# Expected: Docker Compose version v2.x.x
```

### 3. Verify Docker Daemon Connectivity
```powershell
docker info
# Expected: Displays Server Version, Operating System (linux), and WSL2 backend details without connection errors
```

### 4. Run Non-Destructive Smoke Container
```powershell
docker run --rm hello-world
# Expected: "Hello from Docker! This message shows that your installation appears to be working correctly."
```

### 5. Validate Bebsayik Staging Compose Configuration (Dry Run)
Validate the syntax of the staging Compose stack without spinning up containers:
```powershell
docker compose -f docker-compose.staging.yml config
# Expected: Prints parsed Compose YAML with zero syntax or environment errors
```

---

## 6. Safety & Isolation from Current Development Environment

To ensure your existing development servers (`npm run dev:all`) and MongoDB database (`bebsayik_dev`) remain 100% untouched:

| Dimension | Active Development Environment | Bebsayik Staging Container Stack | Isolation Guarantee |
| :--- | :--- | :--- | :--- |
| **Database** | `bebsayik_dev` on Atlas | `bebsayik_staging` | Strictly separated database names; restore to `bebsayik_dev` is permanently blocked |
| **API Port** | `127.0.0.1:5000` | Configurable: `${STAGING_API_PORT:-127.0.0.1:5001}` | Staging port override prevents port 5000 conflict with dev daemon |
| **Frontend Port**| Ports 3000, 3001, 3002 | Configurable: `${STAGING_WEB_PORT:-8080}` | Staging Nginx port override prevents port 80 conflict |
| **Redis** | In-Memory fallback / local | Container `bebsayik-redis-staging` | Isolated Docker bridge network `staging_backend_net` |

---

## 7. Next Step

Review this guide and decide when you would like to proceed with the installation. Once you have installed Docker Desktop and rebooted, run the verification commands in Section 5 to confirm host readiness for staging container spinup.
