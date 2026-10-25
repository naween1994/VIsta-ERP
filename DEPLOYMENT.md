# Google Cloud Run deployment

This service uses Cloud Run for the web app and MongoDB Atlas as its durable data store. The runtime refuses to start in production without MongoDB, a session-signing key, and an initial administrator password. `data/` is excluded from the container image. Import the local JSON only when the target database is empty; skip the import when deploying to an existing database that already contains the intended ERP data.

## 1. Add secret versions

The dedicated secret resources exist in project `radiant-destiny-366613`. The MongoDB URI and administrator password already have enabled versions. Add a version for the session secret, which is required:

- `vista-erp-mongodb-uri`: the Atlas connection string for a dedicated database.
- `vista-erp-session-secret`: a randomly generated value of at least 32 characters.
- `vista-erp-admin-password`: a unique administrator password of at least 12 characters.
- `vista-erp-google-maps-api-key` (optional): a restricted Google Maps API key, needed only for interactive maps and delivery routes.

In Google Cloud Console, open **Security > Secret Manager**, select the secret, and choose **Add new version**. Generate a random session value with a password manager or secure generator; do not reuse an account password. Do not put secret values in this repository, shell command arguments, or chat. Ensure the Atlas database user is restricted to this database and Atlas network access permits both the one-time import and Cloud Run to connect. Cloud Run has dynamic egress IPs; use an approved static-egress setup if your Atlas allowlist requires fixed IPs.

The Maps key is visible to browsers and is not a confidential server credential. In Google Cloud Console, open **Google Maps Platform > APIs & Services > Credentials**, create an API key, and enable **Maps JavaScript API** and **Geocoding API**. Restrict the key to those APIs. After deployment, add an HTTP referrer restriction for the exact Cloud Run service URL followed by `/*`. Get the URL with `gcloud run services describe vista-erp --project radiant-destiny-366613 --region asia-east1 --format="value(status.url)"` and append `/*` (the current URL is `https://vista-erp-67iqvjm3nq-de.a.run.app/*`). Add local development origins separately if needed. Store the restricted key in the optional Secret Manager resource above; the app serves it to the frontend at runtime, so changing the key does not require rebuilding the image. Without this key, the rest of the ERP still works and map areas show a configuration notice.

## 2. Grant one-time import access

The `vista-erp-runtime` service account already exists and has access to the three required ERP secrets and the optional Maps key. Grant your Cloud Build execution service account access to the MongoDB URI and administrator-password secrets for the one-time import.

```powershell
$project = "radiant-destiny-366613"
$buildServiceAccount = gcloud builds get-default-service-account --project $project
if (-not $buildServiceAccount) { throw "Could not determine the Cloud Build service account." }

foreach ($secret in @("vista-erp-mongodb-uri", "vista-erp-admin-password")) {
  gcloud secrets add-iam-policy-binding $secret --project $project --member "serviceAccount:$buildServiceAccount" --role "roles/secretmanager.secretAccessor"
}
```

This project uses `612049145024-compute@developer.gserviceaccount.com` as its default Cloud Build service account. If the build is configured to use a different service account, grant the two import permissions to that account instead.

## 3. Import the current JSON data (only for an empty database)

Skip this step when deploying to an existing database that already contains the intended ERP data. The guarded import fails before writing if any target collection contains records. When importing into a new, empty database, it hashes stored passwords and replaces the admin password with the dedicated initial administrator secret.

```powershell
gcloud builds submit --project radiant-destiny-366613 --config cloudbuild-import.yaml .
```

Run this before deploying only when you intend to initialize an empty database from `data/db.json`. Never rerun it against a live or populated database.

## 4. Deploy

The deployment uses a separate service name (`vista-erp`) so it will not replace the existing `usa-auto-care` service. The app is publicly reachable over HTTPS, but all business APIs require the app's server-validated session cookie.

```powershell
gcloud run deploy vista-erp `
  --project radiant-destiny-366613 `
  --region asia-east1 `
  --source . `
  --service-account vista-erp-runtime@radiant-destiny-366613.iam.gserviceaccount.com `
  --set-secrets "MONGODB_URI=vista-erp-mongodb-uri:latest,SESSION_SECRET=vista-erp-session-secret:latest,INITIAL_ADMIN_PASSWORD=vista-erp-admin-password:latest" `
  --allow-unauthenticated `
  --max 1 `
  --memory 1Gi `
  --cpu 1 `
  --timeout 900
```

If you configured the optional Maps key, add `,GOOGLE_MAPS_API_KEY=vista-erp-google-maps-api-key:latest` to the `--set-secrets` list. The secret must have a version before including it.

After deployment, use the URL from `gcloud run services describe vista-erp --project radiant-destiny-366613 --region asia-east1 --format="value(status.url)"`. Sign in using the administrator email in the imported data and the value of `vista-erp-admin-password`; reset staff passwords from the user-management page before sharing access.

The `/health` and `/api/health` probes are intentionally public and contain operational status only. The app does not support user impersonation, and passwords are stored using scrypt hashes.
