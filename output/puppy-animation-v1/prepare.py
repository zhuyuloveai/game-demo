"""Package the generated 4x2 sprite sheet without synthesizing character motion."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
source = Image.open(OUT / 'generated-sheet.png').convert('RGBA')
frames = []
atlas = Image.new('RGBA', (880, 448))
for i in range(8):
    col, row = i % 4, i // 4
    bounds = (round(col * source.width / 4), round(row * source.height / 2),
              round((col + 1) * source.width / 4), round((row + 1) * source.height / 2))
    frame = source.crop(bounds).resize((220, 224), Image.Resampling.LANCZOS)
    frames.append(frame)
    atlas.paste(frame, (col * 220, row * 224))
atlas.save(ROOT / 'kitchen-merge/dist/assets/cabinet-v5/ui/puppy-idle-v1.webp', lossless=True)

# Preview plays the same brief blink-and-wave, with the production resting time.
sequence = [0, 1, 2, 1, 0, 4, 5, 6, 4, 0]
durations = [21600, 160, 120, 120, 160, 240, 560, 240, 240, 560]
preview = [frames[i] for i in sequence]
preview[0].save(OUT / 'puppy-animation.webp', save_all=True, append_images=preview[1:],
                duration=durations, loop=0, lossless=True)
# A short inspection loop makes all poses reviewable without a long wait.
preview[0].save(OUT / 'puppy-actions-preview.webp', save_all=True, append_images=preview[1:],
                duration=[800, *durations[1:]], loop=0, lossless=True)
print('Prepared 8 transparent frames; production sequence rests for 21.6 seconds.')
