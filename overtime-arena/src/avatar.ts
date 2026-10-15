export const AVATAR_SIZE = 256;
export const MAX_AVATAR_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_DATA_LENGTH = 512 * 1024;
export const DEFAULT_AVATAR_URL = '/assets/weixin-avatar-front-v1.png';
export const DEFAULT_AVATAR_PROFILE_URL = '/assets/weixin-avatar-profile-v1.png';
export const AVATAR_STORAGE_KEY = 'overtime-arena.avatar.weixin-20261009.v1';
export interface AvatarCropControls { zoom: number; horizontal: number; vertical: number; }
export interface AvatarCrop { x: number; y: number; size: number; }
export const DEFAULT_AVATAR_CROP: AvatarCropControls = { zoom: 1, horizontal: 0, vertical: 0 };
const bounded = (value: number, min: number, max: number, fallback: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

/** Source-space square: zoom never reveals empty pixels, pan covers all legal crop centers. */
export function calculateAvatarCrop(width: number, height: number, controls: AvatarCropControls): AvatarCrop {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('照片尺寸无效，请重新选择。');
  const zoom = bounded(controls.zoom, 1, 4, 1);
  const size = Math.min(width, height) / zoom;
  const horizontal = bounded(controls.horizontal, -1, 1, 0);
  const vertical = bounded(controls.vertical, -1, 1, 0);
  return { x: (width - size) * (horizontal + 1) / 2, y: (height - size) * (vertical + 1) / 2, size };
}

function imageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 12 && [82, 73, 70, 70].every((v, i) => bytes[i] === v) && [87, 69, 66, 80].every((v, i) => bytes[i + 8] === v)) return 'image/webp';
  return null;
}

/** Only small local raster data URLs are accepted; image decoding remains a separate check. */
export function isAvatarDataUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_AVATAR_DATA_LENGTH) return false;
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  try {
    const bytes = atob(match[2]);
    // Reject noncanonical padding bits and mislabeled/unsupported image content.
    if (btoa(bytes) !== match[2]) return false;
    return imageMime(Uint8Array.from(bytes.slice(0, 12), c => c.charCodeAt(0))) === match[1];
  } catch { return false; }
}

function aborted(): DOMException { return new DOMException('头像读取已取消。', 'AbortError'); }
function decodeLocalImage(src: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(aborted()); return; }
    const image = new Image();
    image.decoding = 'async';
    const cleanup = () => { image.onload = null; image.onerror = null; signal.removeEventListener('abort', cancel); };
    const cancel = () => { cleanup(); image.src = ''; reject(aborted()); };
    image.onload = () => {
      cleanup();
      if (!image.naturalWidth || !image.naturalHeight) { reject(new Error('这张照片无法解码，请换一张 JPG、PNG 或 WebP。')); return; }
      resolve(image);
    };
    image.onerror = () => { cleanup(); reject(new Error('这张照片无法解码，请换一张 JPG、PNG 或 WebP。')); };
    signal.addEventListener('abort', cancel, { once: true });
    image.src = src;
  });
}

export async function loadAvatarFile(file: File, signal: AbortSignal): Promise<HTMLImageElement> {
  if (file.size > MAX_AVATAR_FILE_BYTES) throw new Error('照片超过 10 MB，请换一张较小的照片。');
  if (!file.size) throw new Error('照片内容为空，请重新选择。');
  if (file.type && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 格式的照片。');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (signal.aborted) throw aborted();
  if (!imageMime(header)) throw new Error('照片格式无法识别，请选择 JPG、PNG 或 WebP。');
  const url = URL.createObjectURL(file);
  try { return await decodeLocalImage(url, signal); }
  finally { URL.revokeObjectURL(url); }
}

export async function loadSavedAvatar(dataUrl: string, signal: AbortSignal): Promise<HTMLImageElement> {
  if (!isAvatarDataUrl(dataUrl)) throw new Error('保存的头像已失效，请重新选择照片。');
  const image = await decodeLocalImage(dataUrl, signal);
  if (image.naturalWidth !== AVATAR_SIZE || image.naturalHeight !== AVATAR_SIZE) {
    image.src = '';
    throw new Error('保存的头像尺寸无效，请重新选择照片。');
  }
  return image;
}

export function drawAvatarCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, controls: AvatarCropControls): void {
  const crop = calculateAvatarCrop(image.naturalWidth, image.naturalHeight, controls);
  canvas.width = AVATAR_SIZE; canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器无法处理头像，请尝试其他浏览器。');
  context.clearRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.save();
  context.beginPath();
  context.arc(AVATAR_SIZE / 2, AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
  context.clip();
  context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.restore();
}
