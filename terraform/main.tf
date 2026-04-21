###############################################################################
# main.tf — GCP Infrastructure for Node.js DevSecOps Pipeline
# Project: prismatic-rock-485510-c2
# Resources: Artifact Registry → Cloud Run → IAM
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Uncomment after creating the GCS bucket for remote state (recommended):
  # backend "gcs" {
  #   bucket = "prismatic-rock-485510-c2-tfstate"
  #   prefix = "devsecops/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {
  project_id = var.project_id
}

###############################################################################
# 1. Enable required APIs
###############################################################################

resource "google_project_service" "run_api" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry_api" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam_api" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secretmanager_api" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudkms_api" {
  service            = "cloudkms.googleapis.com"
  disable_on_destroy = false
}

resource "google_kms_key_ring" "artifact_registry" {
  name     = var.artifact_kms_key_ring
  location = var.region

  depends_on = [google_project_service.cloudkms_api]
}

resource "google_kms_crypto_key" "artifact_registry" {
  name            = var.artifact_kms_crypto_key
  key_ring        = google_kms_key_ring.artifact_registry.id
  rotation_period = var.artifact_kms_rotation_period

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key_iam_member" "artifact_registry_service_agent" {
  crypto_key_id = google_kms_crypto_key.artifact_registry.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-artifactregistry.iam.gserviceaccount.com"
}

###############################################################################
# 2. Artifact Registry — Docker image repository
###############################################################################

resource "google_artifact_registry_repository" "app_repo" {
  location      = var.region
  repository_id = "${var.app_name}-repo"
  description   = "Docker images for ${var.app_name} DevSecOps pipeline"
  format        = "DOCKER"
  kms_key_name  = google_kms_crypto_key.artifact_registry.id

  # Security: immutable tags prevent overwriting scanned images
  docker_config {
    immutable_tags = false # set true in production after pipeline is stable
  }

  # Cost control: automatically delete images older than the 10 most recent.
  # Each deploy pushes a new image tagged with git SHA — without this, hundreds
  # of images would accumulate at ~$0.10/GB/month.
  # "keep-recent" keeps the 10 newest; anything older is eligible for deletion.
  cleanup_policies {
    id     = "keep-10-most-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      older_than = "604800s" # 7 days (168 hours) — never delete images less than a week old regardless
    }
  }

  cleanup_policy_dry_run = false # set true to preview what would be deleted without actually deleting

  depends_on = [
    google_project_service.artifact_registry_api,
    google_kms_crypto_key.artifact_registry,
    google_kms_crypto_key_iam_member.artifact_registry_service_agent,
  ]
}


###############################################################################
# 3. Service Account — least-privilege for Cloud Run
###############################################################################

resource "google_service_account" "cloud_run_sa" {
  account_id   = "${var.app_name}-run-sa"
  display_name = "Cloud Run Service Account for ${var.app_name}"
  description  = "Minimal permissions: Cloud Run invoker only. No admin rights."
}

# Allow Cloud Run to pull images from Artifact Registry
resource "google_artifact_registry_repository_iam_member" "run_sa_reader" {
  location   = google_artifact_registry_repository.app_repo.location
  repository = google_artifact_registry_repository.app_repo.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Allow Cloud Run to read secrets from Secret Manager
resource "google_project_iam_member" "run_sa_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

###############################################################################
# 3b. Secret Manager — Gemini API key + Firebase service account (values added out-of-band)
###############################################################################

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = var.gemini_secret_name

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager_api]
}

# Firebase Admin SDK service account key for zentype-65eb3
# Allows the Cloud Run container to authenticate against the Firebase project
# and perform Admin SDK operations (token verification, Firestore writes)
resource "google_secret_manager_secret" "firebase_service_account" {
  secret_id = "firebase-service-account"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager_api]
}

###############################################################################
# 4. Service Account — CI/CD (GitHub Actions deploys images + runs TF)
###############################################################################

resource "google_service_account" "cicd_sa" {
  account_id   = "${var.app_name}-cicd-sa"
  display_name = "CI/CD Service Account for ${var.app_name}"
  description  = "Used by GitHub Actions to push images and deploy Cloud Run."
}

# Push images to Artifact Registry
resource "google_artifact_registry_repository_iam_member" "cicd_sa_writer" {
  location   = google_artifact_registry_repository.app_repo.location
  repository = google_artifact_registry_repository.app_repo.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# Deploy new revisions to Cloud Run
resource "google_project_iam_member" "cicd_sa_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# Allow CI/CD SA to act as the Cloud Run SA (required for deployment)
resource "google_service_account_iam_member" "cicd_sa_act_as_run_sa" {
  service_account_id = google_service_account.cloud_run_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# Allow the CI OIDC deployer principal to set Cloud Run runtime service account.
resource "google_service_account_iam_member" "deployer_act_as_run_sa" {
  count              = var.deployer_service_account_email != "" ? 1 : 0
  service_account_id = google_service_account.cloud_run_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.deployer_service_account_email}"
}

###############################################################################
# 5. Cloud Run Service
###############################################################################

resource "google_cloud_run_v2_service" "app" {
  name     = var.app_name
  location = var.region

  template {
    service_account = google_service_account.cloud_run_sa.email

    scaling {
      min_instance_count = 0  # Scale to zero when no traffic (cost-free)
      max_instance_count = var.max_instances
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}/${var.app_name}:${var.image_tag}"

      ports {
        container_port = var.container_port
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle = true  # CPU only allocated during request processing
      }

      # Environment variables — non-sensitive only
      # Secrets go through Secret Manager (see env_vars in variables.tf)
      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Runtime secret injection from Google Secret Manager.
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }

      # Firebase Admin SDK — service account JSON for zentype-65eb3
      # Required for server-side token verification and Firestore writes
      env {
        name = "FIREBASE_SERVICE_ACCOUNT_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.firebase_service_account.secret_id
            version = "latest"
          }
        }
      }

      # Liveness probe — Cloud Run restarts container if this fails
      liveness_probe {
        http_get {
          path = var.health_check_path
        }
        initial_delay_seconds = 10
        period_seconds        = 30
        failure_threshold     = 3
      }

      startup_probe {
        http_get {
          path = var.health_check_path
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 10
      }
    }
  }

  depends_on = [
    google_project_service.run_api,
    google_artifact_registry_repository.app_repo,
    google_secret_manager_secret.gemini_api_key,
    google_secret_manager_secret.firebase_service_account,
    google_service_account_iam_member.cicd_sa_act_as_run_sa,
    google_service_account_iam_member.deployer_act_as_run_sa,
  ]
}

###############################################################################
# 6. IAM — Public access (unauthenticated) — remove if app requires auth
###############################################################################

resource "google_cloud_run_v2_service_iam_member" "public_access" {
  count    = var.allow_public_access ? 1 : 0
  project  = google_cloud_run_v2_service.app.project
  location = google_cloud_run_v2_service.app.location
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
