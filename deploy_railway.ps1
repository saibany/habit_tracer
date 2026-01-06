
$env:RAILWAY_TOKEN = "9f57d33d-14fa-48cd-9599-6b8d9757f5d7"

Write-Host "Verifying authentication..."
railway whoami

# Check if project is linked, if not try to init
if (-not (Test-Path .railway)) {
    Write-Host "Initializing new project..."
    # 'n' to setup now? No, usually init creates it. 
    # We'll try just 'railway up' which handles creation.
}

Write-Host "Deploying..."
# --detach to avoid streaming logs indefinitely
# --service to deploy the current directory as a service
railway up --detach
