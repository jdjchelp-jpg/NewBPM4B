"""Zero-dependency test runner (pytest is optional, not required).

    python tests/run.py
"""
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))          # tests/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # python/
import test_engines  # noqa: E402

failures = 0
tests = [(n, f) for n, f in vars(test_engines).items() if n.startswith("test_") and callable(f)]
for name, fn in tests:
    try:
        fn()
        print(f"  ok   {name}")
    except Exception:
        failures += 1
        print(f"  FAIL {name}")
        traceback.print_exc()

print(f"\n{len(tests) - failures}/{len(tests)} passed")
sys.exit(1 if failures else 0)
