# Upload secrets to GitHub from .env (Windows PowerShell).
# Run in PowerShell from repo root:
#   .\scripts\set-github-secrets.ps1

$ErrorActionPreference = "Stop"
$Gh = "${env:ProgramFiles}\GitHub CLI\gh.exe"
$Repo = "arvind-sahu/Task-Mgmt"

if (-not (Test-Path $Gh)) {
  Write-Host "Install GitHub CLI: https://cli.github.com/"
  exit 1
}

& $Gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Run first: & '$Gh' auth login"
  exit 1
}

$envFile = Join-Path $PSScriptRoot "..\.env" | Resolve-Path
$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $k, $v = $_ -split '=', 2
  $vars[$k.Trim()] = $v.Trim()
}

function Set-GhSecret($Name, $Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing value for $Name in .env"
  }
  Write-Host "Setting $Name ..."
  $Value | & $Gh secret set $Name --repo $Repo
}

# Database — simple secrets (recommended)
Set-GhSecret "SUPABASE_PROJECT_REF" "qgofdiippdlcbtbpqlas"
$dbPassword = Read-Host "Supabase database password (plain, e.g. Supabase@2k25)"
Set-GhSecret "SUPABASE_DB_PASSWORD" $dbPassword

# App auth from .env
Set-GhSecret "NEXTAUTH_SECRET" $vars["NEXTAUTH_SECRET"]
Set-GhSecret "NEXTAUTH_URL" $vars["NEXTAUTH_URL"]

if ($vars["AUTH_GITHUB_ID"]) { Set-GhSecret "AUTH_GITHUB_ID" $vars["AUTH_GITHUB_ID"] }
if ($vars["AUTH_GITHUB_SECRET"]) { Set-GhSecret "AUTH_GITHUB_SECRET" $vars["AUTH_GITHUB_SECRET"] }
if ($vars["GOOGLE_CLIENT_ID"]) { Set-GhSecret "GOOGLE_CLIENT_ID" $vars["GOOGLE_CLIENT_ID"] }
if ($vars["GOOGLE_CLIENT_SECRET"]) { Set-GhSecret "GOOGLE_CLIENT_SECRET" $vars["GOOGLE_CLIENT_SECRET"] }

# AWS
$awsKey = Read-Host "AWS_ACCESS_KEY_ID"
$awsSecret = Read-Host "AWS_SECRET_ACCESS_KEY" -AsSecureString
$awsSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($awsSecret))
Set-GhSecret "AWS_ACCESS_KEY_ID" $awsKey
Set-GhSecret "AWS_SECRET_ACCESS_KEY" $awsSecretPlain
Set-GhSecret "AWS_REGION" "ap-south-1"

Write-Host ""
Write-Host "Done. Secrets: https://github.com/$Repo/settings/secrets/actions"
Write-Host "Re-run: Actions -> Deploy to AWS -> Run workflow"
