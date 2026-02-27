#!/usr/bin/env bash
set -e # exit immediately on error

# =========================================================================
# Windows XP Web OS Clone - GCP Deployment Script
# Provisions Cloud SQL (PostgreSQL) and Cloud Run instances
# =========================================================================

# --- CONFIGURATION (Edit these variables) ---
PROJECT_ID="your-gcp-project-id"
REGION="us-central1"

# Database Config
DB_INSTANCE_NAME="xp-clone-db-instance"
DB_NAME="xpclone"
DB_USER="xpadmin"
DB_PASS="SuperSecretPassword123!" # Change this before running!

# Cloud Run Services
BACKEND_SVC_NAME="xp-clone-backend"
FRONTEND_SVC_NAME="xp-clone-frontend"
ARTIFACT_REPO="xp-clone-repo"

echo "=== 🚀 Starting GCP Deployment for Windows XP Clone ==="

# 1. Set the active project
gcloud config set project $PROJECT_ID
gcloud services enable sqladmin.googleapis.com run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# =========================================================================
# 2. PROVISION GOOGLE CLOUD SQL (POSTGRESQL)
# =========================================================================
echo "🗄️ Provisioning Cloud SQL PostgreSQL 15 instance (This takes 5-10 minutes)..."
gcloud sql instances create $DB_INSTANCE_NAME \
    --database-version=POSTGRES_15 \
    --cpu=1 --memory=3840MB \
    --region=$REGION \
    --root-password=$DB_PASS \
    --edition=ENTERPRISE

echo "📝 Creating Database '$DB_NAME'..."
gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE_NAME

echo "👤 Creating Database User '$DB_USER'..."
gcloud sql users create $DB_USER --instance=$DB_INSTANCE_NAME --password=$DB_PASS

# Get the connection name format (project:region:instance)
DB_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format="value(connectionName)")

# Note: To run the schema.sql against this database, you can use Cloud SQL Auth Proxy locally:
# ./cloud-sql-proxy $DB_CONNECTION_NAME
# psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME -f database/schema.sql

# =========================================================================
# 3. SET UP ARTIFACT REGISTRY
# =========================================================================
echo "📦 Setting up Artifact Registry..."
gcloud artifacts repositories create $ARTIFACT_REPO \
    --repository-format=docker \
    --location=$REGION \
    --description="XP Clone Docker repository" || true # ignore if already exists

gcloud auth configure-docker $REGION-docker.pkg.dev

# =========================================================================
# 4. DEPLOY BACKEND TO CLOUD RUN
# =========================================================================
echo "⚙️ Building and Deploying Backend API..."
BACKEND_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$ARTIFACT_REPO/$BACKEND_SVC_NAME:latest"

cd backend
# Build the backend docker image using Cloud Build
gcloud builds submit --tag $BACKEND_IMAGE .

# Deploy to Cloud Run (attaching the Cloud SQL Instance)
gcloud run deploy $BACKEND_SVC_NAME \
    --image $BACKEND_IMAGE \
    --region $REGION \
    --allow-unauthenticated \
    --add-cloudsql-instances $DB_CONNECTION_NAME \
    --set-env-vars="DB_HOST=/cloudsql/$DB_CONNECTION_NAME,DB_PORT=5432,DB_USER=$DB_USER,DB_PASSWORD=$DB_PASS,DB_NAME=$DB_NAME,JWT_SECRET=super-secret-production-key" \
    --format="value(status.url)" > backend_url.txt

BACKEND_URL=$(cat backend_url.txt)
echo "✅ Backend deployed at: $BACKEND_URL"
rm backend_url.txt
cd ..

# =========================================================================
# 5. DEPLOY FRONTEND TO CLOUD RUN
# =========================================================================
echo "🖥️ Building and Deploying Frontend UI..."
FRONTEND_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$ARTIFACT_REPO/$FRONTEND_SVC_NAME:latest"

cd frontend
# Inject the backend URL into the frontend build environment
# Remember to update the frontend Dockerfile to accept build arguments if doing static SSR/SSG, 
# otherwise Vite needs VITE_API_URL defined during build phase.
echo "VITE_API_URL=$BACKEND_URL/api" > .env.production

gcloud builds submit --tag $FRONTEND_IMAGE .

gcloud run deploy $FRONTEND_SVC_NAME \
    --image $FRONTEND_IMAGE \
    --region $REGION \
    --allow-unauthenticated \
    --format="value(status.url)" > frontend_url.txt

FRONTEND_URL=$(cat frontend_url.txt)
echo "✅ Frontend deployed at: $FRONTEND_URL"
rm frontend_url.txt
cd ..

echo "=== 🎉 Deployment Complete! ==="
echo "Access your Windows XP Clone at: $FRONTEND_URL"
