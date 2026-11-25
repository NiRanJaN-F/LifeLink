# LifeLink AWS Production Deployment Guide

This guide provides end-to-end instructions for deploying **LifeLink** to Amazon Web Services (AWS) using **AWS Free Tier** eligible services with zero or minimal infrastructure costs.

---

## Architecture Overview

```
                      +-----------------------------+
                      |         End Users           |
                      +--------------+--------------+
                                     |
                                     | HTTPS (Port 443)
                                     v
                       +---------------------------+
                       |      AWS CloudFront       |
                       |       (Global CDN)        |
                       +-------------+-------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               | Static Assets (SPA)                       | API Requests (/api/*)
               v                                           v
    +----------------------+                    +----------------------+
    |    Amazon S3 Bucket  |                    |      Amazon EC2      |
    | (Static Web Hosting) |                    |  (Ubuntu 24.04 LTS)  |
    +----------------------+                    |  Nginx Reverse Proxy |
                                                |     Node.js + PM2    |
                                                +----------+-----------+
                                                           |
                                                           | MySQL (Port 3306)
                                                           v
                                                +----------------------+
                                                |    Amazon RDS MySQL  |
                                                |     (db.t3.micro)    |
                                                +----------------------+
```

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Environment Variables Reference](#2-environment-variables-reference)
3. [MySQL Database Schema & Initialization](#3-mysql-database-schema--initialization)
4. [Running the Backend Locally](#4-running-the-backend-locally)
5. [Building the Frontend](#5-building-the-frontend)
6. [Testing the Complete Application Locally](#6-testing-the-complete-application-locally)
7. [AWS Account Setup & Cost Control](#7-aws-account-setup--cost-control)
8. [Configuring Amazon RDS MySQL (Free Tier)](#8-configuring-amazon-rds-mysql-free-tier)
9. [Setting Up Amazon EC2 Backend Server](#9-setting-up-amazon-ec2-backend-server)
10. [Deploying Backend to EC2 with PM2 & Nginx](#10-deploying-backend-to-ec2-with-pm2--nginx)
11. [Creating Amazon S3 Bucket for Frontend](#11-creating-amazon-s3-bucket-for-frontend)
12. [Configuring Amazon CloudFront CDN & SPA Routing](#12-configuring-amazon-cloudfront-cdn--spa-routing)
13. [Configuring CORS & SSL/TLS (HTTPS)](#13-configuring-cors--ssltls-https)
14. [Deployment Verification Checklist](#14-deployment-verification-checklist)
15. [Troubleshooting Common Issues](#15-troubleshooting-common-issues)
16. [Monitoring AWS Usage & Avoiding Unexpected Charges](#16-monitoring-aws-usage--avoiding-unexpected-charges)

---

## 1. Prerequisites

### Local Development Tools (Windows)
- **Node.js**: v18.0.0 or higher (v20+ or v22 recommended). Verify with `node -v`.
- **Git**: Installed and configured. Verify with `git --version`.
- **MySQL Client or MySQL Server**: MySQL 8.0+ or MySQL Workbench for running `.sql` scripts.
- **Docker & Docker Compose** (Optional, for local containerized testing): Verify with `docker compose version`.
- **Windows PowerShell**: Default shell in Windows 10/11.

### AWS Resources Required
- Active AWS Account.
- AWS Region recommendation: `us-east-1` (N. Virginia) or your geographically closest region (e.g., `ap-south-1` for India).

---

## 2. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Local Value Example | AWS Production Value Example |
| :--- | :--- | :--- | :--- |
| `PORT` | HTTP port the Express server listens on | `5000` | `5000` |
| `NODE_ENV` | Runtime environment mode | `development` | `production` |
| `DB_HOST` | MySQL hostname or endpoint | `localhost` | `lifelink-db.czxxxxxxxx.us-east-1.rds.amazonaws.com` |
| `DB_PORT` | MySQL connection port | `3306` | `3306` |
| `DB_USER` | MySQL database user | `root` | `lifelink_admin` |
| `DB_PASSWORD` | MySQL database password | `YourLocalPassword` | `StrongRdsPassword#2026!` |
| `DB_NAME` | Database name | `lifelink_db` | `lifelink_db` |
| `DB_SSL` | Enable SSL for RDS connection | `false` | `false` (within VPC) or `true` |
| `JWT_SECRET` | 64+ char random string for signing JWTs | *(random string)* | *(secure cryptographically generated key)* |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` | `https://d1234abcd.cloudfront.net` |

> [!TIP]
> Generate a strong 64-character `JWT_SECRET` in PowerShell:
> ```powershell
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Frontend (`frontend/.env`)

| Variable | Description | Local Development | AWS Production |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for backend API calls | `http://localhost:5000/api` | `https://api.yourdomain.com/api` or `http://<EC2-PUBLIC-IP>:5000/api` |

---

## 3. MySQL Database Schema & Initialization

The complete database schema is located at `backend/database/schema.sql`.

It establishes:
- `users`: User and donor credentials, roles (`user`, `donor`, `admin`), account status (`active`, `blocked`).
- `blood_groups`: Standard 8 blood groups (`A+`, `A-`, `B+`, `B-`, `O+`, `O-`, `AB+`, `AB-`).
- `donors`: Donor profiles, verification status (`pending`, `verified`, `rejected`), availability.
- `blood_requests`: Blood donation requests, urgency (`normal`, `urgent`, `emergency`), status.
- `request_responses`: Donor responses (`accepted`, `rejected`), with composite unique key `(request_id, donor_id)`.
- `notifications`: Notifications for request owners and donors.

### Initializing MySQL Locally (Windows PowerShell)

```powershell
# 1. Create database in MySQL
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS lifelink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Execute schema file
mysql -u root -p lifelink_db < d:\Lifelink\backend\database\schema.sql
```

---

## 4. Running the Backend Locally

```powershell
# Navigate to backend directory
cd d:\Lifelink\backend

# 1. Copy environment template
Copy-Item .env.example .env

# 2. Edit .env with your local MySQL credentials
notepad .env

# 3. Install dependencies
npm install

# 4. Create an Administrator account
node scripts/createAdmin.js "admin@lifelink.org" "AdminPassword#2026" "LifeLink Admin" "9876543210"

# 5. Start development server
npm run dev
```

Verify backend health at: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 5. Building the Frontend

```powershell
# Navigate to frontend directory
cd d:\Lifelink\frontend

# 1. Copy environment template
Copy-Item .env.example .env

# 2. Configure VITE_API_URL in .env
# For local development: VITE_API_URL=http://localhost:5000/api
# For production build: set to your production backend URL

# 3. Install dependencies
npm install

# 4. Run linter
npm run lint

# 5. Build optimized production bundle
npm run build
```

The output will be created in `frontend/dist/`.

---

## 6. Testing the Complete Application Locally

### Option A: Using NPM & Two Terminals

**Terminal 1 (Backend):**
```powershell
cd d:\Lifelink\backend
npm start
```

**Terminal 2 (Frontend):**
```powershell
cd d:\Lifelink\frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Option B: Using Automated Test Suite
```powershell
cd d:\Lifelink\backend
npm test
```
This runs all 17 automated tests verifying health check, registration validation, JWT validation, blood requests, and donor profiles.

### Option C: Using Docker Compose
```powershell
cd d:\Lifelink
docker compose up --build
```
- Frontend: [http://localhost](http://localhost)
- Backend: [http://localhost:5000](http://localhost:5000)
- MySQL: `localhost:3306`

---

## 7. AWS Account Setup & Cost Control

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Select your target region in the top navigation bar (e.g., `us-east-1`).
3. Set up **Billing Alerts**:
   - Go to **Billing and Cost Management** -> **Billing Preferences**.
   - Check **Receive Free Tier Usage Alerts** and enter your email address.
   - Go to **AWS Budgets** -> **Create Budget** -> Select **Zero spend budget** or **Cost budget** set to `$5/month`.

---

## 8. Configuring Amazon RDS MySQL (Free Tier)

### Step 8.1: Create Security Group for RDS
1. Go to **VPC Console** -> **Security Groups** -> **Create Security Group**.
2. **Name**: `lifelink-rds-sg`
3. **VPC**: Default VPC.
4. **Inbound Rules**:
   - Type: `MYSQL/Aurora` (Port `3306`)
   - Source: `Anywhere-IPv4` (`0.0.0.0/0`) during initial setup, or restrict to EC2 Security Group `lifelink-ec2-sg`.
5. Click **Create security group**.

### Step 8.2: Launch RDS MySQL Instance
1. Go to **RDS Console** -> **Databases** -> **Create database**.
2. **Database creation method**: Standard create.
3. **Engine options**: MySQL (Version: `8.0.x`).
4. **Templates**: **Free tier** (*Critical: Ensures db.t3.micro / db.t4g.micro is selected*).
5. **DB instance identifier**: `lifelink-mysql-db`.
6. **Master username**: `lifelink_admin`.
7. **Master password**: Choose a strong password (e.g. `LifelinkSecurePass2026!`).
8. **Instance configuration**: `db.t3.micro` or `db.t4g.micro` (1 vCPU, 1 GB RAM).
9. **Storage**:
   - Storage type: General Purpose SSD (`gp2` or `gp3`)
   - Allocated storage: `20` GiB
   - **Disable storage autoscaling** (uncheck box to prevent unexpected capacity increases).
10. **Connectivity**:
    - **Public access**: `Yes` (if initializing schema from local computer; can be set to `No` if initializing via EC2).
    - **VPC security group**: Choose `lifelink-rds-sg`.
11. **Additional configuration**:
    - Initial database name: `lifelink_db`.
    - Automated backups: Retention period `1` day (or `0` days to save snapshot costs during evaluation).
12. Click **Create database** (Takes ~5-10 minutes).

### Step 8.3: Initialize Database Schema on RDS
Once the RDS status becomes **Available**, copy its **Endpoint**:
```powershell
# From your local PowerShell, run the schema against RDS:
mysql -h <RDS-ENDPOINT> -P 3306 -u lifelink_admin -p lifelink_db < d:\Lifelink\backend\database\schema.sql
```

---

## 9. Setting Up Amazon EC2 Backend Server

### Step 9.1: Create Security Group for EC2
1. Go to **EC2 Console** -> **Security Groups** -> **Create security group**.
2. **Name**: `lifelink-ec2-sg`
3. **Inbound rules**:
   - **SSH**: Port `22` -> Source: `My IP` (for secure administration).
   - **HTTP**: Port `80` -> Source: `Anywhere-IPv4` (`0.0.0.0/0`).
   - **HTTPS**: Port `443` -> Source: `Anywhere-IPv4` (`0.0.0.0/0`).
   - **Custom TCP**: Port `5000` -> Source: `Anywhere-IPv4` (`0.0.0.0/0`) (optional, if querying port 5000 directly without Nginx).

### Step 9.2: Launch EC2 Instance (Free Tier Eligible)
1. Go to **EC2 Console** -> **Instances** -> **Launch instances**.
2. **Name**: `lifelink-backend-server`.
3. **AMI**: `Ubuntu Server 24.04 LTS` (Free Tier eligible).
4. **Instance type**: `t2.micro` (or `t3.micro` where available in Free Tier).
5. **Key pair**: Create new key pair (e.g., `lifelink-key.pem`) and save securely on your local computer.
6. **Network settings**:
   - Select existing security group: `lifelink-ec2-sg`.
   - Auto-assign public IP: `Enable`.
7. **Storage**: `1 x 8 GiB gp3` (Free Tier covers up to 30 GB EBS).
8. Click **Launch instance**.

---

## 10. Deploying Backend to EC2 with PM2 & Nginx

### Step 10.1: Connect to EC2 (PowerShell)
```powershell
ssh -i "path\to\lifelink-key.pem" ubuntu@<EC2-PUBLIC-IP>
```

### Step 10.2: Install Node.js, Git, PM2 & Nginx on EC2
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Verify installations
node -v
npm -v

# Install PM2 process manager globally
sudo npm install -g pm2
```

### Step 10.3: Clone Repository and Setup Backend
```bash
# Clone the repository
git clone https://github.com/<YOUR-USERNAME>/<REPO-NAME>.git /var/www/lifelink
cd /var/www/lifelink/backend

# Install production dependencies
npm install --omit=dev

# Create production .env file
nano .env
```

Paste your production environment values into `.env`:
```ini
PORT=5000
NODE_ENV=production
DB_HOST=<YOUR-RDS-ENDPOINT>
DB_PORT=3306
DB_USER=lifelink_admin
DB_PASSWORD=<YOUR-RDS-PASSWORD>
DB_NAME=lifelink_db
DB_SSL=false
JWT_SECRET=<YOUR-SECURE-64-CHAR-SECRET>
CLIENT_URL=https://<YOUR-CLOUDFRONT-DOMAIN>.cloudfront.net
```
Press `Ctrl+O`, `Enter`, and `Ctrl+X` to save and exit.

### Step 10.4: Seed Admin User & Start with PM2
```bash
# Create initial Admin account
node scripts/createAdmin.js "admin@lifelink.org" "AdminPass#2026!" "System Admin" "9999999999"

# Start the application using PM2
pm2 start server.js --name "lifelink-api"

# Configure PM2 to start on system boot
pm2 startup
# (Run the sudo env PATH=... command printed by PM2)
pm2 save
```

### Step 10.5: Configure Nginx as Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/lifelink
```

Paste this Nginx server configuration:
```nginx
server {
    listen 80;
    server_name _;

    # Proxy API requests to Node.js on port 5000
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and restart Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/lifelink /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

Verify backend health from your browser or curl:
`http://<EC2-PUBLIC-IP>/api/health`

---

## 11. Creating Amazon S3 Bucket for Frontend

### Step 11.1: Create S3 Bucket
1. Go to **S3 Console** -> **Create bucket**.
2. **Bucket name**: e.g., `lifelink-frontend-<unique-id>`.
3. **Region**: Same region as your EC2 / CloudFront.
4. **Block Public Access settings**: Keep **Block all public access** enabled (*CloudFront will access S3 securely via Origin Access Control - OAC*).
5. Click **Create bucket**.

### Step 11.2: Build Frontend with Production Backend URL
On your local machine in PowerShell:
```powershell
cd d:\Lifelink\frontend

# Edit .env with your EC2 API URL
# Example: VITE_API_URL=http://<EC2-PUBLIC-IP>/api
notepad .env

# Build production assets
npm run build
```

### Step 11.3: Upload `frontend/dist` to S3
Upload files via the AWS Console or using AWS CLI:
```powershell
aws s3 sync d:\Lifelink\frontend\dist s3://lifelink-frontend-<unique-id> --delete
```
*(Or drag-and-drop the contents of `frontend/dist/` into the S3 bucket using the AWS Console).*

---

## 12. Configuring Amazon CloudFront CDN & SPA Routing

### Step 12.1: Create CloudFront Distribution
1. Go to **CloudFront Console** -> **Create distribution**.
2. **Origin domain**: Choose your S3 bucket (`lifelink-frontend-<unique-id>.s3.amazonaws.com`).
3. **Origin access**: Select **Origin access control settings (recommended)** -> Click **Create control setting** -> Create.
4. **Default cache behavior**:
   - Viewer protocol policy: **Redirect HTTP to HTTPS**.
   - Allowed HTTP methods: `GET, HEAD`.
5. **Web Application Firewall (WAF)**: Select **Do not enable security protections** to prevent unexpected AWS WAF charges.
6. **Default root object**: `index.html`.
7. Click **Create distribution**.

### Step 12.2: Apply S3 Bucket Policy for CloudFront
After creation, CloudFront will display a prompt: *"You must update the S3 bucket policy"*.
1. Click **Copy policy**.
2. Go to your S3 bucket -> **Permissions** tab -> **Bucket policy** -> **Edit**.
3. Paste the policy allowing CloudFront OAC read access and save.

### Step 12.3: Configure SPA Routing Fallback (Critical)
Single Page Applications (React Router) require that sub-paths (e.g. `/login`, `/dashboard`, `/blood-requests`) serve `/index.html` when refreshed directly:
1. In your CloudFront distribution, go to the **Error pages** tab.
2. Click **Create custom error response**:
   - **HTTP error code**: `403: Forbidden`
   - **Customize error response**: `Yes`
   - **Response page path**: `/index.html`
   - **HTTP Response code**: `200: OK`
   - Click **Create**.
3. Create a second custom error response:
   - **HTTP error code**: `404: Not Found`
   - **Customize error response**: `Yes`
   - **Response page path**: `/index.html`
   - **HTTP Response code**: `200: OK`
   - Click **Create**.

---

## 13. Configuring CORS & SSL/TLS (HTTPS)

1. Copy your CloudFront distribution domain (e.g. `https://d1234abcd.cloudfront.net`).
2. SSH into your EC2 backend server:
```bash
cd /var/www/lifelink/backend
nano .env
```
Update `CLIENT_URL` to your CloudFront URL:
```ini
CLIENT_URL=https://d1234abcd.cloudfront.net
```
Restart the backend:
```bash
pm2 restart lifelink-api
```

### Free HTTPS on EC2 (Optional Custom Domain)
If you point a domain name (e.g., `api.lifelink.org`) to your EC2 IP address, get a free SSL certificate using Let's Encrypt Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.lifelink.org
```

---

## 14. Deployment Verification Checklist

| Check | Expected Result | Verified |
| :--- | :--- | :---: |
| `GET /api/health` | Returns HTTP 200 with `status: "healthy"` and database connected | [ ] |
| Homepage Load | Loads fast via CloudFront URL over HTTPS | [ ] |
| SPA Route Refresh | Direct refresh on `/login` or `/blood-requests` loads the page without 404/403 | [ ] |
| User Registration | Can register a new donor or standard user | [ ] |
| User Login | Generates valid JWT and redirects to Dashboard | [ ] |
| Donor Search | Filters blood donors by blood group and city | [ ] |
| Blood Request Creation | Posts new request and creates creator notification | [ ] |
| Admin Dashboard | Admin can log in, view platform statistics, and verify donors | [ ] |
| Unauthorized Origin | API blocks cross-origin requests from non-whitelisted domains | [ ] |

---

## 15. Troubleshooting Common Issues

### 1. `CORS request rejected: Origin not permitted`
- Check the `CLIENT_URL` variable in your backend `.env`. It must match the frontend URL exactly (including `https://` without a trailing slash).
- If multiple origins are needed, separate them with a comma: `CLIENT_URL=https://d1234.cloudfront.net,https://lifelink.org`.
- Restart PM2: `pm2 restart lifelink-api`.

### 2. Direct Page Refresh Shows 403 or 404 on CloudFront
- Ensure Custom Error Responses for both `403` and `404` are configured in CloudFront pointing to `/index.html` with status `200`.

### 3. Database Connection Failed (`ECONNREFUSED` or `ETIMEDOUT`)
- Verify RDS Security Group `lifelink-rds-sg` has an inbound rule for port `3306` from the EC2 instance's IP or security group `lifelink-ec2-sg`.
- Verify RDS instance status is **Available** in the AWS Console.
- Test connection from EC2: `nc -zv <RDS-ENDPOINT> 3306`.

### 4. PM2 Process Keeps Restarting
- Check PM2 logs: `pm2 logs lifelink-api --lines 50`.
- Verify `.env` syntax and that `PORT` and `JWT_SECRET` are set.

---

## 16. Monitoring AWS Usage & Avoiding Unexpected Charges

1. **Amazon EC2**:
   - Free Tier includes **750 hours/month** of `t2.micro` or `t3.micro`. Keep only ONE micro instance running to stay 100% within the free allowance.
2. **Amazon RDS**:
   - Free Tier includes **750 hours/month** of Single-AZ `db.t3.micro` or `db.t4g.micro` and **20 GB storage**. Do NOT enable Multi-AZ or storage autoscaling.
3. **Amazon S3**:
   - Free Tier includes **5 GB** standard storage, 20,000 GET requests, and 2,000 PUT requests.
4. **Amazon CloudFront**:
   - Free Tier includes **1 TB data transfer out** and **10,000,000 HTTP/HTTPS requests** per month.
5. **AWS WAF**:
   - Do NOT enable AWS WAF on CloudFront or ALB unless willing to pay ~$5/month per WebACL + $1/rule.
6. **Billing Alerts**:
   - Check AWS Cost Explorer weekly to confirm total forecast spend is `$0.00`.
