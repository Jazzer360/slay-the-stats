"""Upload logic: signed URL request then PUT upload.

Handles retries with exponential backoff for both
the signed-URL request and the file PUT. Tolerates
transient file-lock and network errors.
"""

import logging
import time
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_BACKOFF_S = 2
REQUEST_TIMEOUT_S = 30


def _request_signed_url(
    cloud_function_url: str,
    api_key: str,
    filename: str,
) -> str | None:
    """Request a signed upload URL from the CF.

    Returns the URL string or None on failure.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {"filename": filename}

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(
                cloud_function_url,
                json=payload,
                headers=headers,
                timeout=REQUEST_TIMEOUT_S,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("url")
            if resp.status_code == 403:
                logger.error("Authorization failed (403). Check your API key.")
                return None
            logger.warning(
                "Signed URL request failed: %d %s",
                resp.status_code,
                resp.text[:200],
            )
        except requests.RequestException as exc:
            logger.warning(
                "Network error on signed URL (attempt %d/%d): %s",
                attempt + 1,
                MAX_RETRIES,
                exc,
            )
        if attempt < MAX_RETRIES - 1:
            wait = RETRY_BACKOFF_S * (2**attempt)
            time.sleep(wait)

    logger.error(
        "Failed to get signed URL for %s after %d attempts.",
        filename,
        MAX_RETRIES,
    )
    return None


def _read_file_with_retry(
    file_path: Path,
) -> bytes | None:
    """Read file bytes with retry for file locks.

    Returns bytes on success, None on failure.
    """
    for attempt in range(MAX_RETRIES):
        try:
            return file_path.read_bytes()
        except (OSError, PermissionError) as exc:
            logger.warning(
                "File read error (attempt %d/%d): %s",
                attempt + 1,
                MAX_RETRIES,
                exc,
            )
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BACKOFF_S)
    logger.error(
        "Could not read %s after %d attempts.",
        file_path,
        MAX_RETRIES,
    )
    return None


def _put_file(
    signed_url: str,
    content: bytes,
    filename: str,
) -> bool:
    """PUT file content to the signed URL.

    Returns True on success, False on failure.
    """
    headers = {
        "Content-Type": "application/json",
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.put(
                signed_url,
                data=content,
                headers=headers,
                timeout=REQUEST_TIMEOUT_S,
            )
            if resp.status_code in (200, 201):
                return True
            logger.warning(
                "Upload PUT failed: %d %s",
                resp.status_code,
                resp.text[:200],
            )
        except requests.RequestException as exc:
            logger.warning(
                "Network error uploading (attempt %d/%d): %s",
                attempt + 1,
                MAX_RETRIES,
                exc,
            )
        if attempt < MAX_RETRIES - 1:
            wait = RETRY_BACKOFF_S * (2**attempt)
            time.sleep(wait)

    logger.error(
        "Failed to upload %s after %d attempts.",
        filename,
        MAX_RETRIES,
    )
    return False


def upload_run_file(
    cloud_function_url: str,
    api_key: str,
    file_path: Path,
) -> bool:
    """Full upload flow for a single .run file.

    1. Read file content (with retry).
    2. Request signed URL from Cloud Function.
    3. PUT the content to the signed URL.

    Returns True on success, False on failure.
    """
    filename = file_path.name
    logger.info("Starting upload for %s", filename)

    content = _read_file_with_retry(file_path)
    if content is None:
        return False

    signed_url = _request_signed_url(cloud_function_url, api_key, filename)
    if not signed_url:
        return False

    success = _put_file(signed_url, content, filename)
    if success:
        logger.info("Successfully uploaded %s", filename)
    return success
