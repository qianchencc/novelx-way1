#!/usr/bin/env python3
"""Build transparent NovelX atlas layers and SVG hotspot geometry."""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUTPUT_SIZE = (362, 272)
REGIONS = {
    "western-bay": (0.03, 0.45, 0.47, 0.95),
    "central-ridge": (0.15, 0.07, 0.64, 0.66),
    "northern-forest": (0.45, 0.08, 0.78, 0.48),
    "northern-highlands": (0.03, 0.01, 0.74, 0.31),
    "eastern-lakes": (0.62, 0.06, 0.98, 0.54),
    "southern-forest": (0.53, 0.35, 0.98, 0.87),
    "southern-coast": (0.34, 0.56, 0.99, 0.99),
}
REGION_THRESHOLDS = {
    "northern-forest": 26,
    "northern-highlands": 18,
}


def largest_component(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            if not mask[y, x] or seen[y, x]:
                continue

            queue = deque([(x, y)])
            seen[y, x] = True
            component: list[tuple[int, int]] = []
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < width and 0 <= ny < height and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        queue.append((nx, ny))

            if len(component) > len(best):
                best = component

    result = np.zeros_like(mask, dtype=bool)
    for x, y in best:
        result[y, x] = True
    return result


def fill_holes(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    outside = np.zeros_like(mask, dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        if not mask[0, x]:
            queue.append((x, 0))
        if not mask[height - 1, x]:
            queue.append((x, height - 1))
    for y in range(height):
        if not mask[y, 0]:
            queue.append((0, y))
        if not mask[y, width - 1]:
            queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if outside[y, x] or mask[y, x]:
            continue
        outside[y, x] = True
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and not outside[ny, nx] and not mask[ny, nx]:
                queue.append((nx, ny))

    return ~outside


def close_mask(mask: np.ndarray) -> np.ndarray:
    image = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8))
    image = image.filter(ImageFilter.MaxFilter(11))
    image = image.filter(ImageFilter.MinFilter(7))
    image = image.filter(ImageFilter.GaussianBlur(2.2))
    return np.asarray(image) > 96


def compact_rows(mask: np.ndarray, scale_x: float, scale_y: float) -> str:
    rectangles: list[tuple[int, int, int, int]] = []
    active: dict[tuple[int, int], tuple[int, int, int, int]] = {}

    for y, row in enumerate(mask):
        runs: list[tuple[int, int]] = []
        start = None
        for x, enabled in enumerate(np.append(row, False)):
            if enabled and start is None:
                start = x
            elif not enabled and start is not None:
                runs.append((start, x))
                start = None

        next_active: dict[tuple[int, int], tuple[int, int, int, int]] = {}
        for run in runs:
            if run in active:
                x0, y0, x1, _ = active[run]
                next_active[run] = (x0, y0, x1, y + 1)
            else:
                next_active[run] = (run[0], y, run[1], y + 1)
        rectangles.extend(rect for key, rect in active.items() if key not in next_active)
        active = next_active
    rectangles.extend(active.values())

    commands = []
    for x0, y0, x1, y1 in rectangles:
        x = round(x0 * scale_x, 1)
        y = round(y0 * scale_y, 1)
        width = round((x1 - x0) * scale_x, 1)
        height = round((y1 - y0) * scale_y, 1)
        commands.append(f"M{x} {y}h{width}v{height}h-{width}Z")
    return "".join(commands)


def main() -> None:
    base_image = Image.open(ASSETS / "atlas-base.webp").convert("RGB")
    base = np.asarray(base_image).astype(np.int16)
    height, width = base.shape[:2]

    luminance = np.asarray(base_image.convert("L"), dtype=np.float32)
    paper_alpha = np.clip((luminance - 17.0) * 18.0, 0, 255)
    paper_alpha = np.asarray(Image.fromarray(paper_alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.65)))
    base_rgba = np.dstack((base.astype(np.uint8), paper_alpha))
    Image.fromarray(base_rgba, "RGBA").save(
        ASSETS / "atlas-base-cutout.webp",
        "WEBP",
        quality=94,
        method=6,
    )

    hotspot_paths: dict[str, str] = {}
    debug_masks = Image.new("L", (OUTPUT_SIZE[0] * 4, OUTPUT_SIZE[1] * 2), 0)

    for index, (region, bounds) in enumerate(REGIONS.items()):
        source_image = Image.open(ASSETS / f"atlas-{region}.webp").convert("RGB")
        source = np.asarray(source_image).astype(np.int16)
        delta = np.max(np.abs(source - base), axis=2).astype(np.uint8)
        delta_small = np.asarray(Image.fromarray(delta).resize(OUTPUT_SIZE, Image.Resampling.LANCZOS))

        x0 = int(bounds[0] * OUTPUT_SIZE[0])
        y0 = int(bounds[1] * OUTPUT_SIZE[1])
        x1 = int(bounds[2] * OUTPUT_SIZE[0])
        y1 = int(bounds[3] * OUTPUT_SIZE[1])
        candidate = delta_small > REGION_THRESHOLDS.get(region, 16)
        restricted = np.zeros_like(candidate)
        restricted[y0:y1, x0:x1] = candidate[y0:y1, x0:x1]
        region_mask = fill_holes(largest_component(close_mask(restricted)))
        region_mask = fill_holes(close_mask(region_mask))

        full_mask = Image.fromarray(np.where(region_mask, 255, 0).astype(np.uint8)).resize(
            (width, height), Image.Resampling.LANCZOS
        )
        full_mask = np.asarray(full_mask, dtype=np.float32) / 255.0
        effect_alpha = np.clip((delta.astype(np.float32) - 9.0) * 19.0, 0, 255)
        effect_alpha *= full_mask
        effect_alpha *= paper_alpha.astype(np.float32) / 255.0
        effect_alpha = np.asarray(
            Image.fromarray(effect_alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.45))
        )
        layer_rgba = np.dstack((source.astype(np.uint8), effect_alpha))
        Image.fromarray(layer_rgba, "RGBA").save(
            ASSETS / f"atlas-{region}-layer.webp",
            "WEBP",
            quality=94,
            method=6,
        )

        hotspot_paths[region] = compact_rows(region_mask, width / OUTPUT_SIZE[0], height / OUTPUT_SIZE[1])
        debug_masks.paste(
            Image.fromarray(np.where(region_mask, 255, 0).astype(np.uint8)),
            ((index % 4) * OUTPUT_SIZE[0], (index // 4) * OUTPUT_SIZE[1]),
        )

    hotspot_json = json.dumps(hotspot_paths, ensure_ascii=True, separators=(",", ":"))
    (ASSETS / "atlas-hotspots.json").write_text(
        json.dumps(hotspot_paths, ensure_ascii=True, indent=2),
        encoding="utf-8",
    )
    (ASSETS / "atlas-hotspots.js").write_text(
        f"window.NOVELX_ATLAS_HOTSPOTS={hotspot_json};\n",
        encoding="utf-8",
    )
    debug_masks.save(ASSETS / "atlas-hotspots-preview.png")


if __name__ == "__main__":
    main()
