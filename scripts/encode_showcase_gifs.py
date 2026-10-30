#!/usr/bin/env python3
"""Encode sequential PNG frames captured by Playwright into crisp animated GIFs for README.md."""
from __future__ import annotations
import json
import sys
from pathlib import Path
from PIL import Image


def build_animated_gif(frames_directory: Path, output_gif_path: Path, frame_durations_ms: list[int]) -> dict[str, int | str]:
    frame_files = sorted(frames_directory.glob("frame_*.png"))
    if not frame_files:
        raise RuntimeError(f"No PNG frames found in {frames_directory}")

    target_width = 1120
    quantized_frames: list[Image.Image] = []

    for frame_file in frame_files:
        with Image.open(frame_file) as raw_image:
            rgb_image = raw_image.convert("RGB")
            aspect_ratio = rgb_image.height / rgb_image.width
            target_height = int(round(target_width * aspect_ratio))
            resized_image = rgb_image.resize((target_width, target_height), Image.Resampling.LANCZOS)
            quantized_frame = resized_image.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
            quantized_frames.append(quantized_frame)

    durations = frame_durations_ms if len(frame_durations_ms) == len(quantized_frames) else [650] * len(quantized_frames)
    output_gif_path.parent.mkdir(parents=True, exist_ok=True)

    quantized_frames[0].save(
        output_gif_path,
        save_all=True,
        append_images=quantized_frames[1:],
        optimize=True,
        duration=durations,
        loop=0,
    )

    return {
        "output": output_gif_path.as_posix(),
        "frames": len(quantized_frames),
        "bytes": output_gif_path.stat().st_size,
    }


def main() -> None:
    manifest_path = Path(sys.argv[1]).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    results = []
    for item in manifest["recordings"]:
        result = build_animated_gif(
            Path(item["frames_directory"]),
            Path(item["output_gif_path"]),
            item["frame_durations_ms"],
        )
        results.append(result)
    print(json.dumps({"encoded_gifs": results}, indent=2))


if __name__ == "__main__":
    main()
