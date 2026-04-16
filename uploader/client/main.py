"""SlayTheStats Uploader — entry point.

Modes:
  --settings / --setup : open the settings GUI
  (default)            : run as background tray app
"""

import logging
import sys

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"


def _setup_logging() -> None:
    """Configure file + console logging."""
    from config import CONFIG_DIR, ensure_config_dir

    ensure_config_dir()
    log_file = CONFIG_DIR / "uploader.log"

    logging.basicConfig(
        level=logging.INFO,
        format=LOG_FORMAT,
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def main() -> None:
    """Route to settings GUI or tray watcher."""
    _setup_logging()

    if "--settings" in sys.argv or "--setup" in sys.argv:
        from settings_gui import SettingsWindow

        window = SettingsWindow()
        window.run()
        return

    from tray_app import TrayApp

    app = TrayApp()
    app.run()


if __name__ == "__main__":
    main()
