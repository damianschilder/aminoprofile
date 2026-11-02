"""Make Aminoprofile's favicon set from the sprout the site already uses (assets/icons/minerals.svg,
a Material Symbols icon). Its first subpath is the outline without the leaf holes: the filled form
of the same symbol. White sprout on a rounded tile in the primary green ($colors--primary).

  python scripts/make-favicons.py . <preview-dir>   (needs rsvg-convert and Pillow)

Writes into <repo>/public: favicon.svg, favicon.ico (16/32/48), apple-touch-icon.png (180, full
bleed), icon-192.png and icon-512.png (rounded tile), icon-maskable-512.png (full bleed, sprout in
the safe zone). Writes a preview sheet to <preview-dir>.
"""
import io
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image

repo, preview_dir = Path(sys.argv[1]), Path(sys.argv[2])
public = repo / 'public'
preview_dir.mkdir(parents=True, exist_ok=True)

GREEN = '#006C45'   # $colors--primary / $primary40
RADIUS = 0.2236     # tile corner as a share of the side

src = (repo / 'assets/icons/minerals.svg').read_text()
d = re.search(r' d="([^"]+)"', src).group(1)
sprout = d.split('Z')[0] + 'Z'   # outer outline only: the filled sprout


def render(svg: str, size: int) -> Image.Image:
    png = subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size)], input=svg.encode(),
                         capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(png)).convert('RGBA')


# 1. Exact bounds of the sprout in the icon's own units (viewBox 0 -960 960 960).
probe = render(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="{sprout}"/></svg>', 960)
x0, y0, x1, y1 = probe.getchannel('A').getbbox()
y0, y1 = y0 - 960, y1 - 960
w, h = x1 - x0, y1 - y0
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
print(f'sprout bounds: x {x0}..{x1}, y {y0}..{y1} ({w}x{h})')


def icon_svg(share: float, rounded: bool) -> str:
    """The sprout's larger side takes `share` of a 960 tile."""
    s = share * 960 / max(w, h)
    rx = f' rx="{round(RADIUS * 960)}"' if rounded else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960">'
            f'<rect width="960" height="960"{rx} fill="{GREEN}"/>'
            f'<path fill="#fff" transform="translate(480 480) scale({s:.4f}) translate({-cx:.1f} {-cy:.1f})" d="{sprout}"/>'
            f'</svg>\n')


tab = icon_svg(0.70, rounded=True)          # browser tab: as big as legible
tile = icon_svg(0.60, rounded=True)         # manifest "any"
bleed = icon_svg(0.50, rounded=False)       # iOS rounds itself; maskable safe zone is the inner 80% circle

(public / 'favicon.svg').write_text(tab)
ico_sizes = [16, 32, 48]
render(tab, 48).save(public / 'favicon.ico', sizes=[(n, n) for n in ico_sizes])
render(bleed, 180).save(public / 'apple-touch-icon.png', optimize=True)
render(tile, 192).save(public / 'icon-192.png', optimize=True)
render(tile, 512).save(public / 'icon-512.png', optimize=True)
render(bleed, 512).save(public / 'icon-maskable-512.png', optimize=True)
for f in ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']:
    print(f'{f}: {(public / f).stat().st_size} bytes')

# 2. Preview: tab sizes on a light and a dark tab bar, enlarged 4x without smoothing, plus the
#    old favicon for comparison, and the big icons.
old = Image.open(public / 'favicon.png').convert('RGBA') if (public / 'favicon.png').exists() else None
sheet = Image.new('RGBA', (900, 420), '#ffffff')
x = 10
for bg in ('#f1f3f4', '#35363a'):
    for size in (16, 32):
        cell = Image.new('RGBA', (size + 8, size + 8), bg)
        cell.alpha_composite(render(tab, size), (4, 4))
        big = cell.resize(((size + 8) * 4, (size + 8) * 4), Image.NEAREST)
        sheet.alpha_composite(big, (x, 10))
        x += big.width + 10
    if old:
        cell = Image.new('RGBA', (40, 40), bg)
        cell.alpha_composite(old, (4, 4))
        sheet.alpha_composite(cell.resize((160, 160), Image.NEAREST), (x, 10))
        x += 170
sheet.alpha_composite(render(tile, 192), (10, 220))
sheet.alpha_composite(render(bleed, 180), (220, 226))
sheet.save(preview_dir / 'favicon-preview.png')
print(f'preview: {preview_dir / "favicon-preview.png"}')
