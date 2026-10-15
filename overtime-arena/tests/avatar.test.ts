import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAvatarCrop, DEFAULT_AVATAR_CROP, isAvatarDataUrl, MAX_AVATAR_DATA_LENGTH } from '../src/avatar.ts';

test('portrait and landscape photos fill the square without stretching', () => {
  assert.deepEqual(calculateAvatarCrop(1200, 800, DEFAULT_AVATAR_CROP), { x: 200, y: 0, size: 800 });
  assert.deepEqual(calculateAvatarCrop(800, 1200, DEFAULT_AVATAR_CROP), { x: 0, y: 200, size: 800 });
});

test('crop pan reaches every edge and zoom stays within the original image', () => {
  assert.deepEqual(calculateAvatarCrop(1200, 800, { zoom: 2, horizontal: -1, vertical: -1 }), { x: 0, y: 0, size: 400 });
  assert.deepEqual(calculateAvatarCrop(1200, 800, { zoom: 2, horizontal: 1, vertical: 1 }), { x: 800, y: 400, size: 400 });
  for (const [width, height] of [[1, 1], [1, 1200], [1200, 1], [3024, 4032]]) {
    for (const zoom of [1, 1.5, 4]) for (const pan of [-1, 0, 1]) {
      const crop = calculateAvatarCrop(width, height, { zoom, horizontal: pan, vertical: -pan });
      assert.ok(crop.x >= 0 && crop.y >= 0 && crop.size > 0);
      assert.ok(crop.x + crop.size <= width + 1e-9 && crop.y + crop.size <= height + 1e-9);
    }
  }
});

test('invalid dimensions fail, while out-of-range controls clamp safely', () => {
  for (const width of [0, -1, NaN, Infinity]) assert.throws(() => calculateAvatarCrop(width, 100, DEFAULT_AVATAR_CROP));
  assert.deepEqual(calculateAvatarCrop(400, 200, { zoom: NaN, horizontal: Infinity, vertical: -Infinity }), { x: 100, y: 0, size: 200 });
  assert.deepEqual(calculateAvatarCrop(400, 200, { zoom: 100, horizontal: 5, vertical: -5 }), { x: 350, y: 0, size: 50 });
});

test('saved avatars allow only small matching PNG/JPEG/WebP base64 data URLs', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const jpeg = 'data:image/jpeg;base64,/9j/';
  const webp = 'data:image/webp;base64,UklGRgAAAABXRUJQ';
  for (const data of [png, jpeg, webp]) assert.equal(isAvatarDataUrl(data), true);
  for (const invalid of [null, '', 'https://example.com/avatar.png', 'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,PHN2Zy8+',
    'data:image/png;base64,/9j/', 'data:image/png;base64,iVBORw0KGgo',
    'data:image/png;base64,iVBORw0KGgo=\n', png + 'A'.repeat(MAX_AVATAR_DATA_LENGTH)]) {
    assert.equal(isAvatarDataUrl(invalid), false);
  }
});
