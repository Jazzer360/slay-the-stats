"""System tray application using pystray.

Runs the watcher in background threads and exposes
a tray icon with Settings, Pause/Resume, Restart,
and Exit menu items.
"""

from __future__ import annotations

import logging
import subprocess
import sys
from typing import Any

import pystray
from config import load_config
from PIL import Image, ImageDraw
from startup import refresh_startup_path
from watcher import RunWatcher

logger = logging.getLogger(__name__)


def _create_icon_image() -> Image.Image:
    """Generate a 64x64 purple tray icon."""
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [4, 4, 60, 60],
        radius=12,
        fill=(147, 51, 234),
    )
    try:
        from PIL import ImageFont

        font = ImageFont.truetype("arialbd.ttf", 40)
    except OSError:
        font = ImageDraw.Draw(img).getfont()  # type: ignore[assignment]
    draw.text(
        (32, 32),
        "S",
        fill=(255, 255, 255),
        font=font,
        anchor="mm",
    )
    return img


class TrayApp:
    """System tray icon managing the watcher."""

    def __init__(self) -> None:
        self._watcher = RunWatcher()
        self._icon: Any = None

    # ── actions ────────────────────────────────────

    def _open_settings(self) -> None:
        """Launch settings GUI as a subprocess."""
        exe = sys.executable
        args = [exe]
        if not getattr(sys, "frozen", False):
            args.append(str(__import__("pathlib").Path(__file__).parent / "main.py"))
        args.append("--settings")
        subprocess.Popen(
            args,
            creationflags=0x00000008,
        )

    def _toggle_pause(
        self,
        icon: Any,
        item: Any,
    ) -> None:
        """Toggle pause/resume."""
        if self._watcher.is_paused:
            self._watcher.resume()
        else:
            self._watcher.pause()
        icon.update_menu()

    def _restart_watcher(
        self,
        icon: Any,
        item: Any,
    ) -> None:
        """Restart with fresh config."""
        self._watcher.restart()
        icon.update_menu()

    def _quit(
        self,
        icon: Any,
        item: Any,
    ) -> None:
        """Stop watcher and exit."""
        self._watcher.stop()
        icon.stop()

    # ── menu ───────────────────────────────────────

    def _status_text(
        self,
        item: Any,
    ) -> str:
        """Dynamic status line for the menu."""
        if self._watcher.is_paused:
            return "Status: Paused"
        n = self._watcher.watched_count
        return f"Status: Watching {n} profile(s)"

    def _pause_text(
        self,
        item: Any,
    ) -> str:
        if self._watcher.is_paused:
            return "Resume Monitoring"
        return "Pause Monitoring"

    def _build_menu(self) -> pystray.Menu:
        return pystray.Menu(
            pystray.MenuItem(
                self._status_text,
                None,
                enabled=False,
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "Settings...",
                lambda i, it: self._open_settings(),
            ),
            pystray.MenuItem(
                self._pause_text,
                self._toggle_pause,
            ),
            pystray.MenuItem(
                "Restart Watcher",
                self._restart_watcher,
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Exit", self._quit),
        )

    # ── run ────────────────────────────────────────

    def run(self) -> None:
        """Start the tray icon and watcher."""
        self._icon = pystray.Icon(
            name="SlayTheStats",
            icon=_create_icon_image(),
            title="SlayTheStats Uploader",
            menu=self._build_menu(),
        )
        if self._icon is not None:
            self._icon.run(setup=self._on_setup)

    def _on_setup(
        self,
        icon: Any,
    ) -> None:
        """Called when the tray icon is ready."""
        icon.visible = True
        refresh_startup_path()
        config = load_config()
        if not config.get("api_key"):
            logger.info("No API key. Opening settings.")
            self._open_settings()
            return
        self._watcher.start()
