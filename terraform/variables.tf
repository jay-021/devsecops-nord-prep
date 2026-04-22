###############################################################################
# variables.tf — All configurable inputs
###############################################################################

variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "prismatic-rock-485510-c2"
}

variable "region" {
  description = "GCP region for all resources. europe-west1 = Belgium (GDPR-friendly)"
  type        = string
  default     = "europe-west1"
}

variable "app_name" {
  description = "Application name — used as prefix for all resource names"
  type        = string
  default     = "devsecops-app"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,28}[a-z0-9]$", var.app_name))
    error_message = "app_name must be lowercase, 4-30 chars, hyphens allowed, start with letter."
  }
}

variable "image_tag" {
  description = "Docker image tag to deploy. Set to git SHA in CI/CD pipeline."
  type        = string
  default     = "latest"
}

variable "container_port" {
  description = "Port your Node.js app listens on inside the container"
  type        = number
  default     = 3000
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances (controls cost ceiling)"
  type        = number
  default     = 3
}

variable "cpu_limit" {
  description = "CPU limit per container instance"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory limit per container instance"
  type        = string
  default     = "512Mi"
}

variable "health_check_path" {
  description = "HTTP path for liveness and startup probes"
  type        = string
  default     = "/"
}

variable "allow_public_access" {
  description = "Set to true to allow unauthenticated public access to Cloud Run"
  type        = bool
  default     = true
}

variable "gemini_secret_name" {
  description = "Secret Manager secret name that stores Gemini API key"
  type        = string
  default     = "gemini-api-key"
}

variable "deployer_service_account_email" {
  description = "Service account email used by CI/CD Terraform apply (OIDC authenticated principal)."
  type        = string
  default     = ""
}

variable "env_vars" {
  description = "Non-sensitive environment variables to inject into the container. Secrets go through Secret Manager, not here."
  type        = map(string)
  default = {
    NODE_ENV = "production"
  }
}

variable "artifact_kms_key_ring" {
  description = "KMS key ring name used to encrypt Artifact Registry repository"
  type        = string
  default     = "artifact-registry-kr"
}

variable "artifact_kms_crypto_key" {
  description = "KMS crypto key name used to encrypt Artifact Registry repository"
  type        = string
  default     = "artifact-registry-key"
}

variable "artifact_kms_rotation_period" {
  description = "Rotation period for Artifact Registry KMS key"
  type        = string
  default     = "7776000s"
}
