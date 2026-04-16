"""Cloud Function: generate signed upload URLs.

HTTP-triggered function that validates an API key against
Firestore, then returns a v4 signed URL for direct PUT
upload to Google Cloud Storage.
"""

import datetime
import os

import functions_framework
from flask import Request, jsonify
from google.auth import default as auth_default
from google.auth.transport import (
    requests as auth_requests,
)
from google.cloud import firestore, storage

BUCKET = os.environ.get(
    "STORAGE_BUCKET",
    "slay-the-stats.firebasestorage.app",
)
URL_EXPIRY_MINUTES = 15
ALLOWED_ORIGINS = [
    "https://slay-the-stats.web.app",
    "https://slay-the-stats.firebaseapp.com",
]

db = firestore.Client()
storage_client = storage.Client()


def _cors_headers(
    origin: str | None,
) -> dict[str, str]:
    """Return CORS headers for the response."""
    allowed = ""
    if origin in ALLOWED_ORIGINS:
        allowed = origin or ""
    return {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Methods": ("POST, OPTIONS"),
        "Access-Control-Allow-Headers": ("Authorization, Content-Type"),
        "Access-Control-Max-Age": "3600",
    }


def _error(
    msg: str,
    status: int,
    origin: str | None = None,
) -> tuple:
    """Return a JSON error response."""
    return (
        jsonify({"error": msg}),
        status,
        _cors_headers(origin),
    )


def _validate_bearer_token(
    request: Request,
) -> tuple[str | None, str | None]:
    """Extract and validate the Bearer API key.

    Returns (uid, None) on success or
    (None, error_message) on failure.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, "Missing or malformed Authorization"

    api_key = auth_header[7:].strip()
    if not api_key:
        return None, "Empty API key"

    docs = db.collection("api_keys").where("key", "==", api_key).limit(1).stream()
    doc = next(docs, None)
    if doc is None:
        return None, "Invalid API key"

    data = doc.to_dict()
    if data is None:
        return None, "Malformed API key record"
    uid = data.get("uid")
    if not uid or not isinstance(uid, str):
        return None, "Malformed API key record"

    return uid, None


def _generate_signed_url(
    uid: str,
    filename: str,
) -> str:
    """Generate a v4 signed PUT URL for the path."""
    credentials, project_id = auth_default()
    if not credentials.valid:
        credentials.refresh(auth_requests.Request())

    sa_email = getattr(
        credentials,
        "service_account_email",
        f"{project_id}@appspot.gserviceaccount.com",
    )

    bucket = storage_client.bucket(BUCKET)
    blob_path = f"users/{uid}/runs/{filename}"
    blob = bucket.blob(blob_path)

    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(
            minutes=URL_EXPIRY_MINUTES,
        ),
        method="PUT",
        content_type="application/json",
        service_account_email=sa_email,
        access_token=credentials.token,
    )
    return url


@functions_framework.http
def generate_signed_url(request: Request):
    """HTTP entry point for signed URL generation.

    Expects POST with JSON body: {"filename": "X.run"}
    and Authorization: Bearer <api_key> header.

    Returns JSON: {"url": "<signed_url>",
                   "path": "users/{uid}/runs/{file}"}
    """
    origin = request.headers.get("Origin")

    if request.method == "OPTIONS":
        return ("", 204, _cors_headers(origin))

    if request.method != "POST":
        return _error("Method not allowed", 405, origin)

    uid, err = _validate_bearer_token(request)
    if err or uid is None:
        return _error(err or "Unauthorized", 403, origin)

    try:
        body = request.get_json(silent=True) or {}
    except Exception:
        return _error("Invalid JSON body", 400, origin)

    filename = body.get("filename", "").strip()
    if not filename or not filename.endswith(".run"):
        return _error(
            "Missing or invalid filename",
            400,
            origin,
        )

    if "/" in filename or "\\" in filename:
        return _error(
            "Filename must not contain path separators",
            400,
            origin,
        )

    try:
        url = _generate_signed_url(uid, filename)
    except Exception as exc:
        return _error(
            f"Signed URL generation failed: {exc}",
            500,
            origin,
        )

    blob_path = f"users/{uid}/runs/{filename}"
    return (
        jsonify({"url": url, "path": blob_path}),
        200,
        _cors_headers(origin),
    )
