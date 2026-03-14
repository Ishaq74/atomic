import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { UploadOptions, UploadResult, AllowedMimeType } from './types';
import { ALLOWED_MIME_TYPES, DEFAULT_MAX_SIZE } from './types';

// ─── Magic bytes signatures for allowed image types ────────────────
const MAGIC_BYTES: Record<string, { offset: number; bytes: number[] }[]> = {
  'image/jpeg': [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] }],
  'image/webp': [{ offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }],
  'image/avif': [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }], // 'ftyp' at offset 4
};

function detectMimeFromBytes(buffer: Buffer): string | null {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (buffer.length < sig.offset + sig.bytes.length) continue;
      const match = sig.bytes.every((b, i) => buffer[sig.offset + i] === b);
      if (match) return mime;
    }
  }
  return null;
}

/**
 * Traite un fichier uploadé : valide type/taille, génère un nom unique,
 * écrit sur le disque dans public/uploads/{subDir}/.
 */
export async function processUpload(
  file: File,
  options: UploadOptions,
): Promise<UploadResult> {
  const { subDir, maxSize = DEFAULT_MAX_SIZE, allowedTypes = ALLOWED_MIME_TYPES } = options;

  // ─── Validation MIME (déclarée par le client) ─────────────────────
  if (!allowedTypes.includes(file.type as AllowedMimeType)) {
    throw new UploadError(
      `Type "${file.type}" non autorisé. Types acceptés : ${allowedTypes.join(', ')}`,
      'INVALID_TYPE',
    );
  }

  // ─── Validation taille ───────────────────────────────────────────
  if (file.size > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(1);
    throw new UploadError(
      `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum : ${maxMB} MB`,
      'FILE_TOO_LARGE',
    );
  }

  // ─── Génération nom unique ───────────────────────────────────────
  const ext = extname(file.name) || mimeToExt(file.type);
  const filename = `${randomUUID()}${ext}`;

  // ─── Écriture sur disque ─────────────────────────────────────────
  const dir = join(process.cwd(), 'public', 'uploads', subDir);
  await mkdir(dir, { recursive: true });

  const filePath = join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  // ─── Validation magic bytes (contenu réel du fichier) ────────────
  const detectedMime = detectMimeFromBytes(buffer);
  if (!detectedMime || !allowedTypes.includes(detectedMime as AllowedMimeType)) {
    throw new UploadError(
      `Le contenu du fichier ne correspond pas à un type autorisé (détecté : ${detectedMime ?? 'inconnu'})`,
      'INVALID_CONTENT',
    );
  }

  await writeFile(filePath, buffer);

  return {
    filename,
    path: filePath,
    url: `/uploads/${subDir}/${filename}`,
  };
}

/** Déduit l'extension depuis le type MIME */
function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/avif': '.avif',
  };
  return map[mime] ?? '.bin';
}

/** Erreur d'upload typée */
export class UploadError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}
