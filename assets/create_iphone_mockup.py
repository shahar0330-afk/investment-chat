#!/usr/bin/env python3
"""Create iPhone mockup frames around screenshots."""
from PIL import Image, ImageDraw, ImageFont
import os

ASSETS = os.path.expanduser('~/investment-chat/assets')

def create_iphone_mockup(screenshot_path, output_path, scale=1.0):
    """Create an iPhone-style frame around a screenshot."""
    # Load screenshot
    screen = Image.open(screenshot_path).convert('RGBA')
    sw, sh = screen.size

    # iPhone frame dimensions
    border = int(28 * scale)
    top_notch = int(65 * scale)
    bottom_bar = int(45 * scale)
    corner_r = int(55 * scale)

    frame_w = sw + border * 2
    frame_h = sh + top_notch + bottom_bar

    # Create frame
    frame = Image.new('RGBA', (frame_w, frame_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)

    # Phone body (rounded rectangle)
    draw.rounded_rectangle(
        [0, 0, frame_w - 1, frame_h - 1],
        radius=corner_r,
        fill=(30, 30, 50, 255),
        outline=(80, 80, 120, 255),
        width=3
    )

    # Inner bezel
    draw.rounded_rectangle(
        [border - 4, top_notch - 4, frame_w - border + 3, frame_h - bottom_bar + 3],
        radius=int(12 * scale),
        fill=(10, 10, 15, 255),
        outline=(50, 50, 80, 180),
        width=2
    )

    # Paste screenshot
    frame.paste(screen, (border, top_notch))

    # Dynamic island (notch)
    notch_w = int(120 * scale)
    notch_h = int(28 * scale)
    notch_x = (frame_w - notch_w) // 2
    notch_y = int(18 * scale)
    draw.rounded_rectangle(
        [notch_x, notch_y, notch_x + notch_w, notch_y + notch_h],
        radius=int(14 * scale),
        fill=(0, 0, 0, 255)
    )

    # Camera dot
    cam_r = int(6 * scale)
    cam_x = notch_x + notch_w - int(30 * scale)
    cam_y = notch_y + notch_h // 2
    draw.ellipse([cam_x - cam_r, cam_y - cam_r, cam_x + cam_r, cam_y + cam_r],
                 fill=(20, 20, 40, 255), outline=(60, 60, 100, 200))

    # Bottom home indicator bar
    bar_w = int(130 * scale)
    bar_h = int(5 * scale)
    bar_x = (frame_w - bar_w) // 2
    bar_y = frame_h - int(20 * scale)
    draw.rounded_rectangle(
        [bar_x, bar_y, bar_x + bar_w, bar_y + bar_h],
        radius=int(3 * scale),
        fill=(150, 150, 170, 200)
    )

    # Side button (power)
    draw.rounded_rectangle(
        [frame_w - 2, int(180 * scale), frame_w + 2, int(250 * scale)],
        radius=2,
        fill=(50, 50, 70, 255)
    )

    # Volume buttons
    draw.rounded_rectangle(
        [-3, int(160 * scale), 1, int(210 * scale)],
        radius=2,
        fill=(50, 50, 70, 255)
    )
    draw.rounded_rectangle(
        [-3, int(225 * scale), 1, int(275 * scale)],
        radius=2,
        fill=(50, 50, 70, 255)
    )

    frame.save(output_path, 'PNG')
    print(f'Created: {output_path} ({frame_w}x{frame_h})')
    return frame_w, frame_h


# Create mockups
for name in ['screen-chat', 'screen-portfolio', 'app-screenshot']:
    src = f'{ASSETS}/{name}.png'
    dst = f'{ASSETS}/iphone-{name}.png'
    if os.path.exists(src):
        create_iphone_mockup(src, dst, scale=2.0)
