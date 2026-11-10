"""Private line protocol for the computer backend's CPU inference worker."""

import json
from pathlib import Path
import sys

import numpy as np
import torch

from ronin_model import load_model, window_velocities


def main():
    torch.set_num_threads(2)
    model = load_model(Path(sys.argv[1]), Path(sys.argv[2]), torch)
    for line in sys.stdin:
        try:
            request = json.loads(line)
            frames = np.array(request["frames"], dtype=float)
            velocity = window_velocities(frames[:, 0], frames[:, 1:], request["startMs"], request["count"], model, np, torch)
            response = {"velocities": velocity.tolist()}
        except (KeyError, ValueError, RuntimeError):
            response = {"error": "Inference failed."}
        print(json.dumps(response, allow_nan=False), flush=True)


if __name__ == "__main__":
    main()
