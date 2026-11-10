"""Load the local research checkpoint and evaluate overlapping RoNIN windows."""

import importlib.util


def load_model(repo, checkpoint, torch):
    source = repo / "source" / "model_resnet1d.py"
    if not source.is_file() or not checkpoint.is_file():
        raise ValueError("Supply the upstream RoNIN checkout and the ResNet18 checkpoint.")
    spec = importlib.util.spec_from_file_location("upstream_ronin_model", source)
    upstream = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(upstream)
    model = upstream.ResNet1D(
        6, 2, upstream.BasicBlock1D, [2, 2, 2, 2], base_plane=64,
        output_block=upstream.FCOutputModule, kernel_size=3,
        fc_dim=512, in_dim=7, dropout=.5, trans_planes=128,
    )
    weights = torch.load(checkpoint, map_location="cpu", weights_only=True)
    model.load_state_dict(weights["model_state_dict"])
    return model.eval()


def window_velocities(times, features, start, count, model, np, torch):
    # At 200 Hz a 1 s window has 200 samples and the 50 ms stride has 10.
    indices = np.arange(count) * 10
    grid = start + np.arange(indices[-1] + 200) * 5
    signal = np.column_stack([np.interp(grid, times, axis) for axis in features.T]).astype(np.float32)
    predictions = []
    with torch.inference_mode():
        for batch in np.array_split(indices, (count + 63) // 64):
            windows = np.stack([signal[i:i + 200].T for i in batch])
            predictions.append(model(torch.from_numpy(windows)).cpu().numpy())
    velocity = np.concatenate(predictions)
    if not np.isfinite(velocity).all():
        raise ValueError("RoNIN returned non-finite velocity predictions.")
    return velocity
