"""File system watcher for .run files.

Uses watchdog to monitor configured profile directories.
New .run files are queued and uploaded in a background
thread. Previously uploaded files are tracked and skipped.
"""

from __future__ import annotations

import logging
import queue
import threading
from pathlib import Path
from typing import Any

from config import (
    load_config,
    load_uploaded,
    mark_uploaded,
)
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from uploader import upload_run_file  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)


class _RunFileHandler(FileSystemEventHandler):
    """Queue newly created .run files."""

    def __init__(
        self,
        upload_queue: queue.Queue,
    ) -> None:
        super().__init__()
        self._queue = upload_queue

    def on_created(self, event) -> None:
        if event.is_directory:
            return
        path = Path(event.src_path)
        if path.suffix == ".run":
            logger.info("Detected new file: %s", path.name)
            self._queue.put(path)


class RunWatcher:
    """Manage watchdog observers and upload queue."""

    def __init__(self) -> None:
        self._observers: list[Any] = []
        self._queue: queue.Queue = queue.Queue()
        self._worker: threading.Thread | None = None
        self._running = False
        self._paused = False
        self._lock = threading.Lock()

    # ── lifecycle ──────────────────────────────────

    def start(self) -> None:
        """Start watching all configured profiles."""
        config = load_config()
        profiles = config.get("profiles", [])
        if not profiles:
            logger.warning("No profiles configured.")
            return

        self._running = True
        self._start_upload_worker(config)

        handler = _RunFileHandler(self._queue)
        for profile_path in profiles:
            path = Path(profile_path)
            if not path.exists():
                logger.warning(
                    "Path does not exist: %s",
                    profile_path,
                )
                continue
            obs = Observer()
            obs.schedule(handler, str(path), recursive=False)
            obs.daemon = True
            obs.start()
            self._observers.append(obs)
            logger.info("Watching: %s", path)

    def stop(self) -> None:
        """Stop all observers and upload worker."""
        self._running = False
        for obs in self._observers:
            obs.stop()
        for obs in self._observers:
            obs.join(timeout=5)
        self._observers.clear()
        if self._worker:
            self._worker.join(timeout=5)
            self._worker = None

    def restart(self) -> None:
        """Stop then start with fresh config."""
        self.stop()
        self.start()

    def pause(self) -> None:
        """Pause upload processing."""
        self._paused = True
        logger.info("Watcher paused.")

    def resume(self) -> None:
        """Resume upload processing."""
        self._paused = False
        logger.info("Watcher resumed.")

    # ── properties ─────────────────────────────────

    @property
    def is_paused(self) -> bool:
        return self._paused

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def watched_count(self) -> int:
        return len(self._observers)

    # ── internals ──────────────────────────────────

    def _scan_existing(
        self,
        profiles: list[str],
    ) -> None:
        """Queue existing .run files not yet uploaded."""
        uploaded = load_uploaded()
        for profile_path in profiles:
            path = Path(profile_path)
            if not path.exists():
                continue
            for run_file in path.glob("*.run"):
                if run_file.name not in uploaded:
                    logger.info(
                        "Queuing existing: %s",
                        run_file.name,
                    )
                    self._queue.put(run_file)

    def _start_upload_worker(
        self,
        config: dict,
    ) -> None:
        """Start the background upload thread."""
        self._worker = threading.Thread(
            target=self._upload_loop,
            args=(config,),
            daemon=True,
        )
        self._worker.start()

    def _upload_loop(
        self,
        config: dict,
    ) -> None:
        """Process the upload queue forever."""
        api_key = config.get("api_key", "")
        cf_url = config.get("cloud_function_url", "")
        if not api_key or not cf_url:
            logger.error("API key or cloud function URL not configured.")
            return

        while self._running:
            try:
                file_path = self._queue.get(
                    timeout=1.0,
                )
            except queue.Empty:
                continue

            if self._paused:
                self._queue.put(file_path)
                continue

            uploaded = load_uploaded()
            if file_path.name in uploaded:
                continue

            ok = upload_run_file(
                cf_url,
                api_key,
                file_path,
            )
            if ok:
                mark_uploaded(file_path.name)
