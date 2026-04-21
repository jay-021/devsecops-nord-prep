#!/usr/bin/env bash
# gcp-bootstrap.sh — One-time GCP project setup
# Run this ONCE locally with your personal gcloud account before using Terraform.
# After this, GitHub Actions takes over via the cicd-sa service account.

set -euo pipefail

PROJECT_ID="prismatic-rock-485510-c2"
REGION="europe-west1"
APP_NAME="devsecops-app"
TF_STATE_BUCKET="${PROJECT_ID}-tfstate"

echo "==> Setting active project..."
gcloud config set project "$PROJECT_ID"

echo "==> Enabling required APIs (takes ~60 seconds)..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project="$PROJECT_ID"

echo "==> Creating GCS bucket for Terraform remote state..."
if ! gcloud storage buckets describe "gs://${TF_STATE_BUCKET}" &>/dev/null; then
  gcloud storage buckets create "gs://${TF_STATE_BUCKET}" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --uniform-bucket-level-access
  echo "  Bucket created: gs://${TF_STATE_BUCKET}"
else
  echo "  Bucket already exists — skipping."
fi

echo "==> Running terraform init + apply to create service accounts..."
cd terraform/
terraform init
terraform apply -var="image_tag=bootstrap" -auto-approve
cd ..

echo "==> Generating CI/CD service account JSON key..."
CICD_SA_EMAIL="${APP_NAME}-cicd-sa@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts keys create cicd-sa-key.json \
  --iam-account="$CICD_SA_EMAIL" \
  --project="$PROJECT_ID"

echo ""
echo "============================================================"
echo "  BOOTSTRAP COMPLETE"
echo "============================================================"
echo ""
echo "  Next step: Add the following secrets to your GitHub repo"
echo "  (Settings -> Secrets and variables -> Actions -> New secret)"
echo ""
echo "  GCP_SA_KEY     = contents of cicd-sa-key.json (base64 encode it)"
echo "  GCP_PROJECT_ID = $PROJECT_ID"
echo "  GCP_REGION     = $REGION"
echo ""
echo "  To base64 encode the key:"
echo "    base64 -i cicd-sa-key.json | pbcopy   (macOS — copies to clipboard)"
echo ""
echo "  IMPORTANT: Delete cicd-sa-key.json after copying to GitHub Secrets!"
echo "    rm cicd-sa-key.json"
echo ""
echo "  Then uncomment the GCS backend block in terraform/main.tf."
echo "============================================================"
