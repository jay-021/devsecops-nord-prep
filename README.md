# DevSecOps CI/CD Pipeline — GCP Infrastructure

A production-grade **DevSecOps pipeline** that enforces 9 automated security gates before any code reaches production. Built with Terraform IaC, Docker, and GitHub Actions — deploying a containerized Next.js application to Google Cloud Run.

## Pipeline Architecture

```mermaid
flowchart TD
    A[Code Push / PR] --> B["1) Quality Gate\nLint + Build + Tests"]
    B --> C["2) SAST\nSemgrep"]
    C --> D["3) Secret Scan\ngitleaks"]
    D --> E["4) SCA\nnpm audit"]
    E --> F["5) Container Scan\nTrivy"]
    F --> G["6) DAST\nOWASP ZAP"]
    G --> H["7) IaC Scan\nCheckov"]
    H --> I["8) Terraform Plan"]
    I --> J["9) Deploy\nBuild Image + TF Apply + Smoke Test"]

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style J fill:#0f3460,stroke:#16c79a,color:#fff
```

## Security Gates

| # | Stage | Tool | What It Catches | Fails On |
|---|-------|------|----------------|----------|
| 1 | Quality Gate | ESLint + Next.js Build | Syntax errors, code smells | Any lint/build error |
| 2 | SAST | Semgrep | Injection, XSS, insecure patterns | OWASP Top 10 violations |
| 3 | Secret Scan | gitleaks | API keys, tokens, credentials in code | Any secret detected |
| 4 | SCA | npm audit | Known CVEs in dependencies | HIGH/CRITICAL vulnerabilities |
| 5 | Container Scan | Trivy + custom parser | OS & library CVEs in Docker image | CRITICAL CVEs (custom triage) |
| 6 | DAST | OWASP ZAP Baseline | Runtime web vulnerabilities | HIGH findings |
| 7 | IaC Scan | Checkov | Terraform misconfigurations | Security policy violations |
| 8 | Terraform Plan | Terraform | Infrastructure drift, invalid config | Plan errors |
| 9 | Deploy | Docker + Terraform Apply | — | Smoke test failure |

## Infrastructure (Terraform)

All infrastructure is defined as code in [`terraform/`](./terraform/):

| Resource | Purpose |
|----------|---------|
| **Artifact Registry** | Private Docker image repository (KMS-encrypted, auto-cleanup policy) |
| **Cloud Run** | Serverless container hosting, scales to zero |
| **Service Accounts** | Least-privilege: `cicd-sa` (deploy only) / `run-sa` (runtime only) |
| **Secret Manager** | Runtime secrets injected at deploy — never hardcoded |
| **KMS Key Ring** | Customer-managed encryption for container images |
| **IAM Bindings** | Granular role assignments, no over-provisioned access |

### Key Security Decisions

- **Workload Identity Federation (OIDC)** — GitHub Actions authenticates to GCP without any stored JSON keys
- **Secret Manager injection** — API keys are mounted into Cloud Run at deploy time, never in source code
- **Immutable image tags** — Each deploy is tagged with the git SHA for full traceability
- **Auto-cleanup policies** — Old container images are automatically purged to control storage costs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Application | Next.js 14, TypeScript, Firebase |
| Containerization | Docker (multi-stage build) |
| Infrastructure | Terraform (GCP provider v5) |
| CI/CD | GitHub Actions (9-stage pipeline) |
| Cloud | Google Cloud Run, Artifact Registry, Secret Manager, KMS |
| Auth (CI/CD) | Workload Identity Federation (OIDC, keyless) |
| Security Tools | Semgrep, gitleaks, Trivy, OWASP ZAP, Checkov |

## Quick Start

### Prerequisites
- GCP project with billing enabled
- `gcloud` CLI authenticated
- Terraform >= 1.5

### 1. Bootstrap GCP Resources
```bash
bash gcp-bootstrap.sh
```

### 2. Configure GitHub Variables
Set these as **repository variables** (`Settings → Secrets and variables → Actions → Variables`):

| Variable | Description |
|----------|-------------|
| `GCP_WIF_PROVIDER` | Workload Identity Federation provider path |
| `GCP_WIF_SERVICE_ACCOUNT` | CI/CD service account email |

### 3. Push & Deploy
```bash
git push origin main
```
The pipeline runs all 9 stages automatically. On success, the app is live on Cloud Run.

## Project Structure

```
├── .github/workflows/ci.yml    # 9-stage DevSecOps pipeline
├── terraform/
│   ├── main.tf                 # All GCP resources
│   ├── variables.tf            # Input variables
│   └── outputs.tf              # Cloud Run URL, registry path
├── Dockerfile                  # Multi-stage production build
├── gcp-bootstrap.sh            # One-time GCP project setup
├── scripts/
│   ├── parse_trivy.py          # Custom Trivy vulnerability triage
│   └── setup-devsecops.sh      # Local security tool installer
├── firestore.rules             # Firebase security rules
└── apphosting.yaml             # Firebase App Hosting config
```

## License

This project is part of a DevSecOps portfolio demonstration.
