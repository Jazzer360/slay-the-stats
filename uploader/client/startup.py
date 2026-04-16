"""Windows startup management via the registry.

Controls whether the uploader launches automatically
when the current user logs in to Windows.
"""

import logging
import sys
import winreg
from pathlib import Path

logger = logging.getLogger(__name__)

_REG_RUN_KEY = (
    r"Software\Microsoft\Windows"
    r"\CurrentVersion\Run"
)
_APP_NAME = "SlayTheStatsUploader"


def _get_exe_path() -> str:
    """Return the executable path for the startup entry."""
    if getattr(sys, "frozen", False):
        return f'"{sys.executable}"'
    return f'"{sys.executable}" "{Path(__file__).parent / "main.py"}"'


def is_startup_enabled() -> bool:
    """Check whether the app is in the Run key."""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            _REG_RUN_KEY,
            0,
            winreg.KEY_READ,
        )
        try:
            winreg.QueryValueEx(key, _APP_NAME)
            return True
        except FileNotFoundError:
            return False
        finally:
            winreg.CloseKey(key)
    except OSError:
        return False


def enable_startup() -> None:
    """Add the app to the Windows Run key."""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            _REG_RUN_KEY,
            0,
            winreg.KEY_WRITE,
        )
        try:
            exe = _get_exe_path()
            winreg.SetValueEx(
                key,
                _APP_NAME,
                0,
                winreg.REG_SZ,
                exe,
            )
            logger.info("Startup entry created.")
        finally:
            winreg.CloseKey(key)
    except OSError as exc:
        logger.error("Failed to set startup: %s", exc)


def refresh_startup_path() -> None:
    """Update the Run key if the exe has moved."""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            _REG_RUN_KEY,
            0,
            winreg.KEY_READ | winreg.KEY_WRITE,
        )
        try:
            old, _ = winreg.QueryValueEx(
                key, _APP_NAME,
            )
            current = _get_exe_path()
            if old != current:
                winreg.SetValueEx(
                    key,
                    _APP_NAME,
                    0,
                    winreg.REG_SZ,
                    current,
                )
                logger.info(
                    "Startup path updated: %s",
                    current,
                )
        except FileNotFoundError:
            pass
        finally:
            winreg.CloseKey(key)
    except OSError:
        pass


def disable_startup() -> None:
    """Remove the app from the Windows Run key."""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            _REG_RUN_KEY,
            0,
            winreg.KEY_WRITE,
        )
        try:
            winreg.DeleteValue(key, _APP_NAME)
            logger.info("Startup entry removed.")
        except FileNotFoundError:
            pass
        finally:
            winreg.CloseKey(key)
    except OSError as exc:
        logger.error("Failed to remove startup: %s", exc)
