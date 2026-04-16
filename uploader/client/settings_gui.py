"""Settings GUI using tkinter.

Provides a standalone window for configuring the API
key, selecting monitored profiles, toggling startup,
and setting the Cloud Function URL.
"""

import tkinter as tk
from tkinter import messagebox, ttk

from config import (
    detect_profiles,
    load_config,
    save_config,
)
from startup import (
    disable_startup,
    enable_startup,
    is_startup_enabled,
)


class SettingsWindow:
    """Tkinter settings window."""

    def __init__(self) -> None:
        self._config = load_config()
        self._root = tk.Tk()
        self._root.title("SlayTheStats Uploader — Settings")
        self._root.geometry("540x440")
        self._root.resizable(False, False)
        self._root.configure(bg="#1a1a2e")
        self._profile_vars: list[tuple[dict, tk.BooleanVar]] = []
        self._build_ui()

    # ── UI construction ────────────────────────────

    def _build_ui(self) -> None:
        style = ttk.Style()
        style.theme_use("clam")
        pairs = [
            ("TLabel", "#1a1a2e", "#e0e0e0"),
            ("TButton", "#7c3aed", "#ffffff"),
            ("TCheckbutton", "#1a1a2e", "#e0e0e0"),
            ("TFrame", "#1a1a2e", None),
            ("TLabelframe", "#1a1a2e", "#e0e0e0"),
            (
                "TLabelframe.Label",
                "#1a1a2e",
                "#e0e0e0",
            ),
        ]
        for name, bg, fg in pairs:
            kw: dict = {"background": bg}
            if fg:
                kw["foreground"] = fg
            style.configure(name, **kw)

        main = ttk.Frame(self._root, padding=16)
        main.pack(fill=tk.BOTH, expand=True)

        self._build_api_key(main)
        self._build_profiles(main)
        self._build_options(main)
        self._build_buttons(main)

    def _build_api_key(
        self,
        parent: ttk.Frame,
    ) -> None:
        frame = ttk.LabelFrame(parent, text="API Key", padding=10)
        frame.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(
            frame,
            text=("Paste your API key from the SlayTheStats website:"),
        ).pack(anchor=tk.W)

        self._key_var = tk.StringVar(value=self._config.get("api_key", ""))
        self._key_entry = ttk.Entry(
            frame,
            textvariable=self._key_var,
            width=60,
            show="\u2022",
        )
        self._key_entry.pack(fill=tk.X, pady=(4, 0))

        self._show_key = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            frame,
            text="Show key",
            variable=self._show_key,
            command=self._toggle_key_visibility,
        ).pack(anchor=tk.W, pady=(4, 0))

    def _toggle_key_visibility(self) -> None:
        if self._show_key.get():
            self._key_entry.configure(show="")
        else:
            self._key_entry.configure(show="\u2022")

    def _build_profiles(
        self,
        parent: ttk.Frame,
    ) -> None:
        frame = ttk.LabelFrame(
            parent,
            text="Profiles to Monitor",
            padding=10,
        )
        frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        detected = detect_profiles()
        configured = set(self._config.get("profiles", []))

        if not detected:
            ttk.Label(
                frame,
                text=("No SlayTheSpire2 profiles found."),
                foreground="#ef4444",
            ).pack(anchor=tk.W)
            return

        for prof in detected:
            checked = prof["path"] in configured
            var = tk.BooleanVar(value=checked)
            label = f"{prof['profile']}  (Steam: {prof['steam_id']})"
            ttk.Checkbutton(frame, text=label, variable=var).pack(anchor=tk.W, pady=2)
            self._profile_vars.append((prof, var))

    def _build_options(
        self,
        parent: ttk.Frame,
    ) -> None:
        frame = ttk.LabelFrame(parent, text="Options", padding=10)
        frame.pack(fill=tk.X, pady=(0, 10))

        self._startup_var = tk.BooleanVar(value=is_startup_enabled())
        ttk.Checkbutton(
            frame,
            text="Run on Windows startup",
            variable=self._startup_var,
        ).pack(anchor=tk.W)

    def _build_buttons(
        self,
        parent: ttk.Frame,
    ) -> None:
        frame = ttk.Frame(parent)
        frame.pack(fill=tk.X, pady=(4, 0))
        ttk.Button(
            frame,
            text="Save Settings",
            command=self._on_save,
        ).pack(side=tk.RIGHT)

    # ── save ───────────────────────────────────────

    def _on_save(self) -> None:
        api_key = self._key_var.get().strip()
        if not api_key:
            messagebox.showwarning(
                "Missing API Key",
                "Please enter your API key.",
            )
            return

        profiles = [prof["path"] for prof, var in self._profile_vars if var.get()]
        if not profiles:
            messagebox.showwarning(
                "No Profiles",
                "Select at least one profile.",
            )
            return

        self._config["api_key"] = api_key
        self._config["profiles"] = profiles
        save_config(self._config)

        if self._startup_var.get():
            enable_startup()
        else:
            disable_startup()

        messagebox.showinfo(
            "Saved",
            "Settings saved successfully.\n\n"
            "Restart the uploader (or use "
            '"Restart Watcher" in the tray menu) '
            "for changes to take effect.",
        )
        self._root.destroy()

    # ── run ────────────────────────────────────────

    def run(self) -> None:
        """Show the settings window."""
        self._root.mainloop()
