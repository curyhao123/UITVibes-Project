# PowerShell script to add authorized redirect URIs to Google OAuth Web Client
# Run this ONLY if you have gcloud CLI installed and authenticated

$CLIENT_ID = "REDACTED-OLD-WEB-CLIENT-ID.apps.googleusercontent.com"
$PROJECT_ID = gcloud config get-value project 2>$null
$URIS = @(
    "https://auth.expo.io/@anonymous/uitvibes",
    "https://auth.expo.io/@anonymous/uitvibes/",
    "uitvibes://",
    "http://localhost:8081",
    "http://localhost:19006"
)

Write-Host "Project: $PROJECT_ID"
Write-Host "Client:  $CLIENT_ID"
Write-Host ""
Write-Host "Adding redirect URIs..."

# Unfortunately gcloud doesn't directly support updating OAuth client redirect URIs.
# You'll need to use the Google Cloud Console UI (recommended) or
# the Google Identity Platform REST API with a service account.
#
# For now, please add these URIs manually in the console:
Write-Host "Please add these URIs to Google Console -> APIs & Services -> Credentials -> Web client ($CLIENT_ID):"
$URIS | ForEach-Object { Write-Host "  - $_" }
