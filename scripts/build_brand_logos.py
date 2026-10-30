#!/usr/bin/env python3
"""Build official vector logos and high-res PNGs for ATLAS Platform."""
import os
import cv2
import numpy as np

def generate_svgs():
    os.makedirs('docs/assets', exist_ok=True)
    os.makedirs('apps/enterprise-rag-web/public', exist_ok=True)

    # 1. Main Chevron + Star Symbol (in a 512x512 coordinate space)
    # Chevron: apex top width 20px, legs slope down to y=358, inner opening from y=222 down to y=358
    chevron_d = (
        "M 106,358 L 174,358 L 254,222 L 260,222 L 338,358 L 404,358 "
        "L 404,352 L 272,130 L 266,126 L 246,126 L 106,352 Z"
    )
    # 4-pointed Star: diamond sparkle with smooth concave curves
    star_d = (
        "M 256,302 Q 254,338 214,342 Q 254,346 256,384 "
        "Q 258,346 298,342 Q 258,338 256,302 Z"
    )

    # 2. logo-light.svg (Squircle #09090B, Symbol #FFFFFF - for Light backgrounds like GitHub Light)
    svg_light = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="ATLAS Logo">
  <title>ATLAS Logo (Light Mode Background)</title>
  <rect x="32" y="32" width="448" height="448" rx="112" ry="112" fill="#09090B" />
  <path fill="#FFFFFF" d="{chevron_d}" />
  <path fill="#FFFFFF" d="{star_d}" />
</svg>"""

    # 3. logo-dark.svg (Squircle #FFFFFF, Symbol #09090B - for Dark backgrounds like GitHub Dark)
    svg_dark = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="ATLAS Logo">
  <title>ATLAS Logo (Dark Mode Background)</title>
  <rect x="32" y="32" width="448" height="448" rx="112" ry="112" fill="#FFFFFF" stroke="#27272A" stroke-width="4" />
  <path fill="#09090B" d="{chevron_d}" />
  <path fill="#09090B" d="{star_d}" />
</svg>"""

    # 4. favicon.svg (Adaptive via @media prefers-color-scheme)
    svg_favicon = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <style>
    .brand-bg {{ fill: #09090B; }}
    .brand-fg {{ fill: #FFFFFF; }}
    @media (prefers-color-scheme: dark) {{
      .brand-bg {{ fill: #FFFFFF; stroke: #27272A; stroke-width: 4px; }}
      .brand-fg {{ fill: #09090B; }}
    }}
  </style>
  <rect class="brand-bg" x="32" y="32" width="448" height="448" rx="112" ry="112" />
  <path class="brand-fg" d="{chevron_d}" />
  <path class="brand-fg" d="{star_d}" />
</svg>"""

    # 5. Extract text contour for ATLAS from user image
    img = cv2.imread(r'C:/Users/Admin/.gemini/antigravity/brain/5aadf11f-1846-443c-aa66-9cb6ce742bc0/.user_uploaded/media_1794187297282_1e279d93.jpg')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    crop_text = gray[200:310, 330:770]
    _, thresh = cv2.threshold(crop_text, 128, 255, cv2.THRESH_BINARY)
    contours, hier = cv2.findContours(thresh, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)

    # Scale text to fit in a 1024x320 lockup
    # Text in crop is 440x110. In lockup: height ~150px, scale=1.45, x offset=350, y offset=85
    text_scale = 1.45
    tx_offset = 340
    ty_offset = 85

    valid = [c for c in contours if cv2.contourArea(c) > 50]
    atlas_text_d = ""
    for c in valid:
        pts = cv2.approxPolyDP(c, 0.7, True).reshape(-1, 2)
        scaled_pts = pts * text_scale + [tx_offset, ty_offset]
        atlas_text_d += f"M {scaled_pts[0][0]:.1f},{scaled_pts[0][1]:.1f} "
        for pt in scaled_pts[1:]:
            atlas_text_d += f"L {pt[0]:.1f},{pt[1]:.1f} "
        atlas_text_d += "Z "

    # Scaled icon for horizontal lockup (size 220x220, placed at x=40, y=50)
    lockup_scale = 220.0 / 512.0
    lx_offset = 40.0
    ly_offset = 50.0

    def transform_path(path_str, s, ox, oy):
        tokens = path_str.split()
        res = []
        i = 0
        while i < len(tokens):
            token = tokens[i]
            if token in ['M', 'L']:
                res.append(token)
                i += 1
                x, y = map(float, tokens[i].split(','))
                res.append(f"{x * s + ox:.1f},{y * s + oy:.1f}")
            elif token == 'Q':
                res.append(token)
                i += 1
                cx, cy = map(float, tokens[i].split(','))
                res.append(f"{cx * s + ox:.1f},{cy * s + oy:.1f}")
                i += 1
                ex, ey = map(float, tokens[i].split(','))
                res.append(f"{ex * s + ox:.1f},{ey * s + oy:.1f}")
            elif token == 'Z':
                res.append('Z')
            i += 1
        return " ".join(res)

    h_chevron_d = transform_path(chevron_d, lockup_scale, lx_offset, ly_offset)
    h_star_d = transform_path(star_d, lockup_scale, lx_offset, ly_offset)
    sq_x = 32 * lockup_scale + lx_offset
    sq_y = 32 * lockup_scale + ly_offset
    sq_w = 448 * lockup_scale
    sq_r = 112 * lockup_scale

    # 6. logo-horizontal-dark.svg (for dark GitHub backgrounds: white text & white squircle)
    svg_h_dark = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 320" width="1024" height="320" role="img" aria-label="ATLAS Logo Dark">
  <title>ATLAS Lockup (Dark Background)</title>
  <rect x="{sq_x:.1f}" y="{sq_y:.1f}" width="{sq_w:.1f}" height="{sq_w:.1f}" rx="{sq_r:.1f}" ry="{sq_r:.1f}" fill="#FFFFFF" stroke="#27272A" stroke-width="2" />
  <path fill="#09090B" d="{h_chevron_d}" />
  <path fill="#09090B" d="{h_star_d}" />
  <path fill="#FFFFFF" fill-rule="evenodd" d="{atlas_text_d}" />
</svg>"""

    # 7. logo-horizontal-light.svg (for light GitHub backgrounds: dark text & dark squircle)
    svg_h_light = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 320" width="1024" height="320" role="img" aria-label="ATLAS Logo Light">
  <title>ATLAS Lockup (Light Background)</title>
  <rect x="{sq_x:.1f}" y="{sq_y:.1f}" width="{sq_w:.1f}" height="{sq_w:.1f}" rx="{sq_r:.1f}" ry="{sq_r:.1f}" fill="#09090B" />
  <path fill="#FFFFFF" d="{h_chevron_d}" />
  <path fill="#FFFFFF" d="{h_star_d}" />
  <path fill="#09090B" fill-rule="evenodd" d="{atlas_text_d}" />
</svg>"""

    with open('docs/assets/logo-light.svg', 'w', encoding='utf-8') as f:
        f.write(svg_light)
    with open('docs/assets/logo-dark.svg', 'w', encoding='utf-8') as f:
        f.write(svg_dark)
    with open('docs/assets/logo-horizontal-light.svg', 'w', encoding='utf-8') as f:
        f.write(svg_h_light)
    with open('docs/assets/logo-horizontal-dark.svg', 'w', encoding='utf-8') as f:
        f.write(svg_h_dark)
    with open('apps/enterprise-rag-web/public/favicon.svg', 'w', encoding='utf-8') as f:
        f.write(svg_favicon)

    print("SVG Brand Assets successfully generated!")

if __name__ == '__main__':
    generate_svgs()
