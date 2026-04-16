# SlayTheStats Desktop Uploader

Background daemon that monitors Slay the Spire 2 run history directories and
automatically uploads new `.run` files to your SlayTheStats account via signed
URLs.

## Architecture

```
┌──────────────────┐       POST /generate_signed_url       ┌────────────────────┐
│  Desktop Client  │ ────────────────────────────────────► │  Cloud Function    │
│  (Python/exe)    │ ◄──── { url: "<signed PUT URL>" } ── │  (GCP, Python)     │
│                  │                                        │                    │
│  watchdog FS     │       PUT <signed URL>                │  Firestore lookup: │
│  monitor         │ ────────────────────────────────────► │  api_keys → uid    │
│                  │       (direct to GCS)                  │                    │
└──────────────────┘                                        └────────────────────┘
                                    │
                                    ▼
                          Google Cloud Storage
                     users/{uid}/runs/{filename}
```

## Components

| Directory         | Contents                        |
| ----------------- | ------------------------------- |
| `cloud_function/` | GCP Cloud Function (Python)     |
| `client/`         | Desktop watcher daemon (Python) |
| `installer/`      | NSIS installer script           |

## Prerequisites

- Python 3.12+
- `gcloud` CLI (for Cloud Function deployment)
- NSIS 3.x (for building the installer)
- PyInstaller 6+ (for building the Windows executable)

## Cloud Function Deployment

```bash
cd cloud_function

gcloud functions deploy generate_signed_url \
    --gen2 \
    --runtime python312 \
    --trigger-http \
    --allow-unauthenticated \
    --region us-central1 \
    --project slay-the-stats \
    --set-env-vars STORAGE_BUCKET=slay-the-stats.firebasestorage.app \
    --entry-point generate_signed_url
```

The Cloud Function's service account requires the
`iam.serviceAccounts.signBlob` permission. Grant the **Service Account Token
Creator** role:

```bash
PROJECT_NUM=$(gcloud projects describe slay-the-stats --format='value(projectNumber)')
SA="${PROJECT_NUM}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding slay-the-stats \
    --member="serviceAccount:${SA}" \
    --role="roles/iam.serviceAccountTokenCreator"
```

## Building the Desktop Client

```bash
cd client
pip install -r requirements.txt
pip install pyinstaller

pyinstaller watcher.spec
```

The executable is written to `client/dist/SlayTheStatsUploader.exe`.

## Building the Installer

After building the executable:

```bash
cd installer
makensis installer.nsi
```

Produces `SlayTheStatsUploader-Setup.exe`.

## Installer Behavior

1. Installs the executable to `%ProgramFiles%\SlayTheStats`.
2. Creates Start Menu shortcuts (launcher and settings).
3. Optionally creates a desktop shortcut.
4. Optionally registers a Windows startup entry.
5. On finish, launches the settings GUI for first-time configuration.

## Configuration

Settings are stored in `%APPDATA%\SlayTheStats\config.json`:

| Key                  | Description                              |
| -------------------- | ---------------------------------------- |
| `api_key`            | Bearer token from the website            |
| `profiles`           | List of history directory paths to watch |
| `cloud_function_url` | Endpoint URL for the signed URL function |
| `run_on_startup`     | Whether to register in Windows startup   |

Upload tracking is stored in `%APPDATA%\SlayTheStats\uploaded.json` (list of
filenames already uploaded; prevents duplicate uploads).

Logs are written to `%APPDATA%\SlayTheStats\uploader.log`.

## Website: API Key Management

Users generate and manage their API key from the **Settings** page on the
website. The key is stored in the Firestore `api_keys` collection:

| Field       | Type      | Description                |
| ----------- | --------- | -------------------------- |
| `uid`       | string    | Firebase Auth UID          |
| `key`       | string    | The API key value          |
| `createdAt` | timestamp | When the key was generated |

The Cloud Function reads this collection via the Admin SDK (bypasses security
rules). Users can read/create/delete only their own key documents via client
security rules.

## Firestore Security Rules

The `api_keys` collection rule (added to `firestore.rules`):

```
match /api_keys/{keyId} {
  allow read: if request.auth != null
              && resource.data.uid == request.auth.uid;
  allow create: if request.auth != null
                && request.resource.data.uid == request.auth.uid
                && request.resource.data.keys().hasOnly(['uid', 'key', 'createdAt']);
  allow delete: if request.auth != null
                && resource.data.uid == request.auth.uid;
}
```

Deploy after updating:

```bash
firebase deploy --only firestore:rules
```
