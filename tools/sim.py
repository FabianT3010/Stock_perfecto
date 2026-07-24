# -*- coding: utf-8 -*-
"""Compatibilidad: ejecuta el calibrador canónico que reutiliza el motor real."""
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent
command = ["node", str(ROOT / "tools" / "calibrate.mjs"), *sys.argv[1:]]
raise SystemExit(subprocess.call(command, cwd=ROOT))
