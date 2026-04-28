#!/usr/bin/env python3
"""运行 TypeScript 检查"""
import subprocess
import os

os.chdir("/Users/zerone/WorkBuddy/20260420104543")
result = subprocess.run(
    ["npx", "tsc", "--noEmit"],
    capture_output=True,
    text=True,
    timeout=60
)
print("=== STDOUT ===")
print(result.stdout[:5000] if result.stdout else "(无输出)")
print("\n=== STDERR ===")
print(result.stderr[:5000] if result.stderr else "(无输出)")
print("\n=== EXIT CODE ===")
print(result.returncode)
