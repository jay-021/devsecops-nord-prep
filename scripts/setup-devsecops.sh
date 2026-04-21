#!/usr/bin/env bash
# setup-devsecops.sh — Local developer security environment setup
# Run once after cloning the repo to verify all tools are installed.
# Safe to run multiple times (idempotent).

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

PASS=0; FAIL=0

pass() { echo -e "${GREEN}  [PASS]${RESET} $1"; ((PASS++)); }
fail() { echo -e "${RED}  [FAIL]${RESET} $1"; ((FAIL++)); }
info() { echo -e "${BLUE}  [INFO]${RESET} $1"; }
warn() { echo -e "${YELLOW}  [WARN]${RESET} $1"; }
header() { echo -e "\n${BOLD}$1${RESET}\n$(printf '─%.0s' {1..50})"; }

# ── 1. Docker ─────────────────────────────────────────────────────────────────
header "1. Docker"
if docker info > /dev/null 2>&1; then
  pass "Docker daemon is running"
else
  fail "Docker is not running — start Docker Desktop and retry"
fi

# ── 2. Node.js / npm ──────────────────────────────────────────────────────────
header "2. Node.js"
if command -v node &> /dev/null; then
  NODE_VER=$(node --version)
  pass "Node.js installed: $NODE_VER"
  if [[ "${NODE_VER}" < "v18" ]]; then
    warn "Node.js $NODE_VER is below v18 — upgrade recommended"
  fi
else
  fail "Node.js not found — install from https://nodejs.org"
fi

# ── 3. npm audit ──────────────────────────────────────────────────────────────
header "3. npm audit (SCA)"
if [[ -f "package.json" ]]; then
  info "Running npm audit..."
  if npm audit --audit-level=high 2>&1; then
    pass "npm audit: no HIGH/CRITICAL vulnerabilities"
  else
    fail "npm audit: HIGH or CRITICAL vulnerabilities found — run 'npm audit fix'"
  fi
else
  warn "No package.json found — skipping npm audit (run from project root)"
fi

# ── 4. gitleaks ───────────────────────────────────────────────────────────────
header "4. gitleaks (Secret Scanning)"
if ! command -v gitleaks &> /dev/null; then
  info "gitleaks not found — attempting install via Homebrew..."
  if command -v brew &> /dev/null; then
    brew install gitleaks
    pass "gitleaks installed via Homebrew"
  else
    warn "Homebrew not available — install gitleaks manually:"
    warn "  https://github.com/gitleaks/gitleaks#installing"
    ((FAIL++))
  fi
else
  pass "gitleaks already installed: $(gitleaks version)"
fi

if command -v gitleaks &> /dev/null; then
  info "Scanning git history for secrets..."
  if gitleaks detect --source . --exit-code 1 2>&1; then
    pass "gitleaks: no secrets detected in git history"
  else
    fail "gitleaks: potential secrets found — review output above and rotate any real credentials"
  fi
fi

# ── 5. Trivy ──────────────────────────────────────────────────────────────────
header "5. Trivy (Container + SCA Scanning)"
if ! command -v trivy &> /dev/null; then
  info "Trivy not found — checking via Docker..."
  if docker info > /dev/null 2>&1; then
    info "Trivy available via Docker (docker run aquasec/trivy)"
    pass "Trivy accessible via Docker"
  else
    warn "Install Trivy: https://aquasecurity.github.io/trivy/latest/getting-started/installation/"
  fi
else
  pass "Trivy installed: $(trivy --version | head -1)"
fi

# ── 6. Semgrep ────────────────────────────────────────────────────────────────
header "6. Semgrep (SAST)"
if ! command -v semgrep &> /dev/null; then
  info "Semgrep not found — attempting pip install..."
  if command -v pip3 &> /dev/null; then
    pip3 install semgrep --quiet
    pass "Semgrep installed via pip"
  else
    warn "pip3 not available — install semgrep: pip install semgrep"
    ((FAIL++))
  fi
else
  pass "Semgrep installed: $(semgrep --version)"
fi

if command -v semgrep &> /dev/null && [[ -f "package.json" ]]; then
  info "Running quick Semgrep SAST scan..."
  if semgrep --config=p/javascript --config=p/nodejs --quiet . 2>&1; then
    pass "Semgrep SAST: no HIGH findings"
  else
    fail "Semgrep SAST: findings detected — review output above"
  fi
fi

# ── 7. Terraform ─────────────────────────────────────────────────────────────
header "7. Terraform"
if command -v terraform &> /dev/null; then
  pass "Terraform installed: $(terraform version | head -1)"
else
  warn "Terraform not installed — install from https://developer.hashicorp.com/terraform/install"
  info "Or via Homebrew: brew install terraform"
fi

# ── 8. Checkov ───────────────────────────────────────────────────────────────
header "8. Checkov (IaC Scanner)"
if ! command -v checkov &> /dev/null; then
  info "Checkov not found — attempting pip install..."
  if command -v pip3 &> /dev/null; then
    pip3 install checkov --quiet
    pass "Checkov installed via pip"
  else
    warn "pip3 not available — install: pip install checkov"
    ((FAIL++))
  fi
else
  pass "Checkov installed: $(checkov --version)"
fi

if command -v checkov &> /dev/null && [[ -d "terraform/" ]]; then
  info "Running Checkov on terraform/ ..."
  if checkov -d terraform/ --framework terraform --quiet 2>&1; then
    pass "Checkov: no HIGH IaC misconfigurations"
  else
    fail "Checkov: IaC issues found — review output above"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n$(printf '═%.0s' {1..50})"
echo -e "${BOLD}  SECURITY SETUP SUMMARY${RESET}"
echo -e "$(printf '═%.0s' {1..50})"
echo -e "  ${GREEN}PASS: $PASS${RESET}"
if [[ $FAIL -gt 0 ]]; then
  echo -e "  ${RED}FAIL: $FAIL${RESET}"
  echo -e "$(printf '═%.0s' {1..50})\n"
  echo -e "${RED}  Some checks failed. Fix the issues above before committing.${RESET}\n"
  exit 1
else
  echo -e "$(printf '═%.0s' {1..50})\n"
  echo -e "${GREEN}  All checks passed. Safe to commit.${RESET}\n"
  exit 0
fi
