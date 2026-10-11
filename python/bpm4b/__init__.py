"""BPM4B Python package.

Shares behaviour with the desktop/Node build: the delimiter engines here are a
direct mirror of electron/ipc/detect.ts (see docs/delimiter-engines/).
"""
from .engines import Engines, CustomEngine, detect, split_chapters, cleanup_title

__version__ = "14.0.0"
__all__ = ["Engines", "CustomEngine", "detect", "split_chapters", "cleanup_title", "__version__"]
