###############################################################################
# outputs.tf — Values printed after terraform apply
###############################################################################

output "cloud_run_url" {
  description = "Public HTTPS URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.app.uri
}

output "artifact_registry_hostname" {
  description = "Docker push target — use this in your GitHub Actions docker push command"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}"
}

output "cicd_service_account_email" {
  description = "Email of the CI/CD service account — add this to GitHub Actions secrets as GCP_SA_EMAIL"
  value       = google_service_account.cicd_sa.email
}

output "cloud_run_service_account_email" {
  description = "Email of the Cloud Run runtime service account"
  value       = google_service_account.cloud_run_sa.email
}

output "deploy_command" {
  description = "Manual deploy command — useful for testing outside CI"
  value       = "gcloud run deploy ${var.app_name} --image ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}/${var.app_name}:latest --region ${var.region} --project ${var.project_id}"
}

output "gemini_secret_name" {
  description = "Secret Manager secret used by Cloud Run for GEMINI_API_KEY"
  value       = google_secret_manager_secret.gemini_api_key.secret_id
}

output "set_gemini_secret_command" {
  description = "Run this manually after terraform apply to set or rotate Gemini key without storing it in Terraform state"
  value       = "printf '%s' '<ROTATED_GEMINI_API_KEY>' | gcloud secrets versions add ${google_secret_manager_secret.gemini_api_key.secret_id} --data-file=- --project ${var.project_id}"
}

output "artifact_registry_kms_key" {
  description = "KMS key used to encrypt Artifact Registry repository"
  value       = google_kms_crypto_key.artifact_registry.id
}
