# Cloud Run Deployment Guide

## Prerequisites
- Google Cloud SDK installed (`gcloud`)
- Docker installed (for local builds)
- Project: your GCP project ID
- Region: `asia-south1` (or your preferred region)

## 1. Authenticate
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region asia-south1
```

## 2. Enable Required APIs
```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com
```

## 3. Grant IAM Roles to Cloud Run Service Account
```bash
# Get the default Compute Engine service account
SA="$(gcloud iam service-accounts list --filter='displayName:Compute Engine' --format='value(email)')"

# Grant Storage Object Admin (for GCS file read/write)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA" \
  --role="roles/storage.objectAdmin"

# Grant Cloud SQL Client (for database access)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA" \
  --role="roles/cloudsql.client"
```

## 4. Build and Deploy
```bash
cd backend

# Build and deploy in one step
gcloud run deploy xp-backend \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=postgresql://xp_admin:Test%401234@34.93.116.4:5432/xpwebos,GCS_BUCKET_NAME=xp-web-os-storage,JWT_SECRET=3c8e4a9b2d1f7c5e8a0b3d6f9a1c4e7b0d2f5a8c1e4b7d0a3f6c9e2b5d8a1c4,PORT=8080" \
  --min-instances=0 \
  --max-instances=3 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60
```

## 5. Verify Deployment
```bash
# Get the service URL
URL=$(gcloud run services describe xp-backend --region asia-south1 --format='value(status.url)')

# Health check
curl "$URL/api/health"
# Expected: {"status":"ok","gcs":"connected","timestamp":"..."}
```

## 6. Update Frontend
Update `VITE_API_URL` in the frontend `.env`:
```
VITE_API_URL=https://xp-backend-XXXXX-el.a.run.app/api
```

## Environment Variables Reference

| Variable | Value | Required |
|---|---|---|
| `DATABASE_URL` | Cloud SQL connection string | ✅ |
| `GCS_BUCKET_NAME` | `xp-web-os-storage` | ✅ |
| `JWT_SECRET` | Your secret key | ✅ |
| `PORT` | `8080` (Cloud Run default) | ✅ |
| `DB_POOL_MAX` | `5` (default) | Optional |

## Architecture

```
Internet → Cloud Run (Node.js Express)
              ├── Cloud SQL (PostgreSQL 15) — user data, VFS, scores
              └── Cloud Storage (GCS) — file content (Notepad saves)
```
