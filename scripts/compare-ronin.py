"""Compare a recorded Campus Quest trial with the upstream RoNIN ResNet18."""

import argparse
import json
from pathlib import Path
import subprocess
import sys

from ronin_model import load_model, window_velocities


def replay_recording(path, ios_motion):
    script = Path(__file__).with_name("replay-motion.mjs")
    command = ["node", str(script), str(path)]
    if ios_motion:
        command.append("--ios-motion")
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode:
        raise ValueError(result.stderr.strip() or "Could not replay the recording.")
    return json.loads(result.stdout)


def ronin_trajectory(times, features, model, np, torch):
    intervals = np.diff(times)
    if np.any(intervals <= 0) or np.any(intervals > 100):
        raise ValueError("Motion samples have gaps over 100 ms or unordered timestamps. Record again in the foreground.")
    grid_count = int((times[-1] - times[0]) // 5) + 1
    if grid_count < 211:
        raise ValueError("RoNIN needs more than one second of usable motion data.")
    count = (grid_count - 201) // 10 + 1
    velocity = window_velocities(times, features, times[0], count, model, np, torch)
    # The target is mean velocity over a forward one-second window.
    # Place that mean at the window midpoint for offline time alignment.
    prediction_time = times[0] + np.arange(count) * 50 + 500
    delta = (velocity[:-1] + velocity[1:]) / 2 * np.diff(prediction_time)[:, None] / 1000
    return prediction_time, np.vstack([np.zeros(2), np.cumsum(delta, axis=0)])


def compare(replay, model, np, torch):
    trace = replay["trace"]
    times = np.array([row["tMs"] for row in trace])
    baseline = np.array([[row["x"], row["y"]] for row in trace], dtype=float)
    features = np.array([row["features"] for row in trace])
    ronin_times, ronin = ronin_trajectory(times, features, model, np, torch)
    marks = replay["marks"]
    start, end = marks[0]["tMs"], marks[-1]["tMs"]
    if start < ronin_times[0] or end > ronin_times[-1]:
        raise ValueError("Hold still for two seconds before the start mark and keep recording for a second after the final mark.")

    def interpolate(t, ts, positions):
        return np.stack([np.interp(t, ts, positions[:, axis]) for axis in (0, 1)], axis=-1)

    baseline -= interpolate(start, times, baseline)
    ronin -= interpolate(start, ronin_times, ronin)
    tracks = {"baseline": (times, baseline), "ronin": (ronin_times, ronin)}
    checkpoints = []
    for mark in marks[1:]:
        actual = np.array([mark["x"], mark["y"]])
        errors = {
            name: float(np.linalg.norm(interpolate(mark["tMs"], ts, points) - actual))
            for name, (ts, points) in tracks.items()
        }
        checkpoints.append({"id": mark["id"], "phase": mark["phase"], "tMs": mark["tMs"], "errorMeters": errors})
    summary = {}
    for name, (ts, points) in tracks.items():
        moving = [row["errorMeters"][name] for row in checkpoints if row["phase"] == "moving"]
        if replay["trial"] == "shake":
            moving_end = marks[1]["tMs"]
            grid = np.linspace(start, moving_end, max(2, round((moving_end - start) / 50) + 1))
            moving = np.linalg.norm(interpolate(grid, ts, points), axis=1)
        settled = [row["errorMeters"][name] for row in checkpoints if row["phase"] == "settled"]
        summary[name] = {
            "movingRmsMeters": float(np.sqrt(np.mean(np.square(moving)))),
            "movingMaxMeters": float(np.max(moving)),
            "settledRmsMeters": float(np.sqrt(np.mean(np.square(settled)))),
        }
    return {
        "trial": replay["trial"],
        "sampleRateHz": float(1000 / np.median(np.diff(times))),
        "missingEventTimestamps": replay["missingTimestamps"],
        "movingReference": "body stays at origin" if replay["trial"] == "shake" else "manual waypoints only",
        "roninInputRateHz": 200,
        "checkpoints": checkpoints,
        "summary": summary,
        "trajectories": {
            name: np.column_stack([ts, points]).tolist() for name, (ts, points) in tracks.items()
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("recording", type=Path)
    parser.add_argument("--ronin-repo", type=Path, required=True)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--ios-motion", action="store_true", help="Use the corrected iPhone WebKit sensor axes.")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        replay = replay_recording(args.recording, args.ios_motion)
        import numpy as np
        import torch

        model = load_model(args.ronin_repo, args.checkpoint, torch)
        report = json.dumps(compare(replay, model, np, torch), indent=2, allow_nan=False) + "\n"
        if args.output:
            with args.output.open("x", encoding="utf-8") as output:
                output.write(report)
            print(f"Saved {args.output}")
        else:
            print(report, end="")
    except (ImportError, KeyError, OSError, RuntimeError, ValueError) as error:
        print(f"Comparison failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
