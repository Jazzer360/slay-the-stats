"""Configuration management for SlayTheStats Uploader.

Stores settings in %APPDATA%/SlayTheStats/config.json
and upload tracking in uploaded.json.
"""

import json
import os
from pathlib import Path

CONFIG_DIR = Path(os.environ.get("APPDATA", "")) / "SlayTheStats"
CONFIG_FILE = CONFIG_DIR / "config.json"
UPLOADED_FILE = CONFIG_DIR / "uploaded.json"

_DEFAULT_CF_URL = (
    "https://us-central1-slay-the-stats.cloudfunctions.net/generate-signed-url"
)

DEFAULT_CONFIG: dict = {
    "api_key": "",
    "profiles": [],
    "cloud_function_url": _DEFAULT_CF_URL,
    "run_on_startup": False,
}


def ensure_config_dir() -> None:
    """Create the config directory if absent."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> dict:
    """Load configuration from disk.

    Missing keys are filled from DEFAULT_CONFIG.
    Returns a fresh copy of defaults on any error.
    """
    ensure_config_dir()
    if not CONFIG_FILE.exists():
        return dict(DEFAULT_CONFIG)
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        merged = dict(DEFAULT_CONFIG)
        merged.update(data)
        return merged
    except (json.JSONDecodeError, OSError):
        return dict(DEFAULT_CONFIG)


def save_config(config: dict) -> None:
    """Persist configuration to disk."""
    ensure_config_dir()
    with open(CONFIG_FILE, "w", encoding="utf-8") as fh:
        json.dump(config, fh, indent=2)


def load_uploaded() -> set[str]:
    """Load previously uploaded file names."""
    ensure_config_dir()
    if not UPLOADED_FILE.exists():
        return set()
    try:
        with open(UPLOADED_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list):
            return set(data)
        return set()
    except (json.JSONDecodeError, OSError):
        return set()


def mark_uploaded(filename: str) -> None:
    """Add a filename to the uploaded set."""
    uploaded = load_uploaded()
    uploaded.add(filename)
    ensure_config_dir()
    with open(UPLOADED_FILE, "w", encoding="utf-8") as fh:
        json.dump(sorted(uploaded), fh, indent=2)


def detect_profiles() -> list[dict[str, str]]:
    """Scan SlayTheSpire2 directory for profiles.

    Returns a list of dicts with keys:
      path     – full path to the history directory
      steam_id – Steam user ID folder name
      profile  – profile folder name (e.g. profile1)
    """
    sts2_root = Path(os.environ.get("APPDATA", "")) / "SlayTheSpire2"
    profiles: list[dict[str, str]] = []

    steam_dir = sts2_root / "steam"
    if not steam_dir.exists():
        return profiles

    for steam_id_dir in steam_dir.iterdir():
        if not steam_id_dir.is_dir():
            continue
        for profile_dir in steam_id_dir.iterdir():
            if not profile_dir.is_dir():
                continue
            history = profile_dir / "saves" / "history"
            if history.exists():
                profiles.append(
                    {
                        "path": str(history),
                        "steam_id": steam_id_dir.name,
                        "profile": profile_dir.name,
                    }
                )

    return profiles
