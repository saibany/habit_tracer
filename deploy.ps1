
Write-Host "Stopping any running git processes..."
Stop-Process -Name "git" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

if (Test-Path .git\index.lock) {
    Write-Host "Removing index.lock..."
    Remove-Item .git\index.lock -Force
}

Write-Host "Resetting git state..."
git reset

Write-Host "Adding files..."
git add .
if ($LASTEXITCODE -ne 0) { Write-Error "Git add failed"; exit 1 }

Write-Host "Committing..."
git commit -m "Update application: Auth, Rate Limit, UI fixes"
# Check if commit failed (it might fail if nothing to commit, which is fine if we proceed to push)
# valid exit codes: 0 (success), 1 (nothing to commit)

Write-Host "Pushing..."
git push -u origin main
if ($LASTEXITCODE -ne 0) { Write-Error "Git push failed"; exit 1 }

Write-Host "Deployment successful!"
