import { validationError } from "./http";

/**
 * Yüklənən faylın yoxlanması. Mock serverdə fayllar data URL kimi yaddaşda saxlanılır;
 * real backend-də bu, obyekt anbarına (S3) yükləmə və təhlükəsizlik skanı ilə əvəz olunur (PRD §66).
 */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"];

export function checkDataUrl(dataUrl: unknown, field: string, opts: { types?: string[]; maxMb?: number } = {}) {
  const types = opts.types ?? IMAGE_TYPES;
  const maxBytes = (opts.maxMb ?? 5) * 1024 * 1024;
  const match = typeof dataUrl === "string" ? /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl) : null;
  if (!match) throw validationError({ [field]: ["validation.fileInvalid"] });
  const mimeType = match[1]!;
  if (!types.includes(mimeType)) throw validationError({ [field]: ["validation.fileType"] });
  const size = Math.floor((match[2]!.length * 3) / 4);
  if (size > maxBytes) throw validationError({ [field]: ["validation.fileTooLarge"] });
  return { mimeType, size };
}
