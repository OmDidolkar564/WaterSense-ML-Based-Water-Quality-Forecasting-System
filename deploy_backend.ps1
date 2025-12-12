# Deploy Backend to Hugging Face
$ErrorActionPreference = "Stop"

Write-Host "Starting Backend Deployment..." -ForegroundColor Green

# 1. Setup clean temp folder
if (Test-Path "hf_deploy_temp") {
    Remove-Item "hf_deploy_temp" -Recurse -Force
}
New-Item -ItemType Directory -Force -Path "hf_deploy_temp" | Out-Null

# 2. Copy API files
Write-Host "Copying files..."
Copy-Item "api\*" "hf_deploy_temp" -Recurse

# 3. Initialize fresh Git repo
Set-Location "hf_deploy_temp"
git init
git lfs install

# 4. Configure LFS explicitly
Write-Host "Configuring LFS..."
git lfs track "*.pkl"
git lfs track "*.gz"
git lfs track "*.zip"
"*.pkl filter=lfs diff=lfs merge=lfs -text" | Out-File .gitattributes -Encoding utf8 -Append
"*.gz filter=lfs diff=lfs merge=lfs -text" | Out-File .gitattributes -Encoding utf8 -Append
"*.zip filter=lfs diff=lfs merge=lfs -text" | Out-File .gitattributes -Encoding utf8 -Append

# 5. Commit
git add .
git commit -m "Deploy backend"

# 6. Push
Write-Host "Pushing to Hugging Face..."
git remote add space https://huggingface.co/spaces/OmDidolkar/groundwater-backend
git push space master:main --force

# Cleanup
Set-Location ..
Remove-Item "hf_deploy_temp" -Recurse -Force

Write-Host "Deployment Complete!" -ForegroundColor Green
