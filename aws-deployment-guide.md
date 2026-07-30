# AWS Deployment Guide for Arogya Camp OS

This guide explains how to deploy the unified offline-first stack (Frontend, Backend, PowerSync, and PostgreSQL) onto a single AWS EC2 instance.

## Prerequisites

1. An **AWS EC2 instance** running Ubuntu 22.04 LTS (t3.medium or larger recommended).
2. **Security Groups** configured to allow incoming traffic on ports:
   - `80` (HTTP - Frontend)
   - `443` (HTTPS - Future SSL)
   - `5000` (Node.js API)
   - `8080` (PowerSync API)
   - `22` (SSH)

## Step 1: Install Docker on the EC2 Instance

SSH into your EC2 instance and install Docker and Docker Compose:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
newgrp docker
```

## Step 2: Transfer Files to EC2

You can use `git clone` to pull your repository onto the EC2 instance, or use `scp` or `rsync` to copy the files from your local machine.

```bash
# Example using git
git clone https://github.com/your-username/NGO-project-2.git /home/ubuntu/camp-os
cd /home/ubuntu/camp-os
```

## Step 3: Configure Environment Variables

The `docker-compose.yml` uses some default environment variables. In a production environment, you **must** change the following:
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `POSTGRES_PASSWORD`

*(You can set these inside an `.env` file or directly in the `docker-compose.yml` before deploying)*

## Step 4: Build and Deploy

Run the following command from the root of your project directory (`/home/ubuntu/camp-os`) to build the images and start the services in detached mode:

```bash
docker compose up --build -d
```

### What this does:
1. Compiles the Vite/React frontend and serves it statically on port `80` via Nginx.
2. Builds the Node.js backend and exposes the API on port `5000`.
3. Starts the official PowerSync image on port `8080`.
4. Starts the Postgres Database on port `5432` securely hidden within the Docker network.

## Step 5: Verify the Deployment

- **Frontend:** Visit `http://<YOUR_EC2_PUBLIC_IP>` in your browser. You should see the CampCare Login screen.
- **Backend API:** Visit `http://<YOUR_EC2_PUBLIC_IP>:5000/api/v1/health`. It should return a JSON status indicating `ok`.
- **PowerSync API:** Visit `http://<YOUR_EC2_PUBLIC_IP>:8080`.

## Step 6: Connect a Custom Domain (Optional but Recommended)

1. Buy a domain from a registrar (e.g., Namecheap, Cloudflare).
2. Create `A` records pointing to your `<YOUR_EC2_PUBLIC_IP>`:
   - `@` -> `<YOUR_EC2_PUBLIC_IP>`
   - `api` -> `<YOUR_EC2_PUBLIC_IP>`
   - `sync` -> `<YOUR_EC2_PUBLIC_IP>`
3. Set your Frontend `VITE_API_URL` to `http://api.yourdomain.com:5000` (or setup a reverse proxy to handle paths natively).
