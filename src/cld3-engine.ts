/**
 * CLD3-based language detection engine using WebAssembly
 * Uses Google's Compact Language Detector v3 neural network model
 */

import type { LanguageDetectionResult } from "./types";
import type { CldFactory, LanguageResult } from "cld3-asm";

type LoadModule = (timeout?: number) => Promise<CldFactory>;

// CLD3 supports 104 languages
// https://github.com/google/cld3?tab=readme-ov-file#supported-languages
export const CLD3_SUPPORTED_LANGUAGES = new Set([
  "af", "am", "ar", "bg", "bg-Latn", "bn", "bs", "ca", "ceb", "co", "cs", "cy",
  "da", "de", "el", "el-Latn", "en", "eo", "es", "et", "eu", "fa", "fi", "fil",
  "fr", "fy", "ga", "gd", "gl", "gu", "ha", "haw", "hi", "hi-Latn", "hmn", "hr",
  "ht", "hu", "hy", "id", "ig", "is", "it", "iw", "ja", "ja-Latn", "jv", "ka",
  "kk", "km", "kn", "ko", "ku", "ky", "la", "lb", "lo", "lt", "lv", "mg", "mi",
  "mk", "ml", "mn", "mr", "ms", "mt", "my", "ne", "nl", "no", "ny", "pa", "pl",
  "ps", "pt", "ro", "ru", "ru-Latn", "sd", "si", "sk", "sl", "sm", "sn", "so",
  "sq", "sr", "st", "su", "sv", "sw", "ta", "te", "tg", "th", "tr", "uk", "ur",
  "uz", "vi", "xh", "yi", "yo", "zh", "zh-Latn", "zu",
]);

// Lazy-loaded CLD3 module
let cldFactory: CldFactory | null = null;
let loadingPromise: Promise<CldFactory> | null = null;

/**
 * Initialize the CLD3 WebAssembly module
 */
export async function initCld3(timeout = 10000): Promise<CldFactory> {
  if (cldFactory) {
    return cldFactory;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // Dynamic import to support tree-shaking
      const { loadModule } = (await import("cld3-asm")) as {
        loadModule: LoadModule;
      };
      cldFactory = await loadModule(timeout);
      return cldFactory;
    } catch (error) {
      loadingPromise = null;
      throw new Error(`Failed to load CLD3 module: ${error}`);
    }
  })();

  return loadingPromise;
}

/**
 * Check if CLD3 is initialized
 */
export function isCld3Ready(): boolean {
  return cldFactory !== null;
}

/**
 * Detect language using CLD3 neural network model
 *
 * @param text - Text to analyze
 * @param numResults - Number of top results to return (default: 10)
 */
export async function detectWithCld3(
  text: string,
  numResults = 10
): Promise<LanguageDetectionResult[]> {
  const factory = await initCld3();

  // Create identifier with default byte limits
  const identifier = factory.create(0, 1000);

  try {
    // Get multiple language predictions
    const results = identifier.findMostFrequentLanguages(text, numResults);

    // Map CLD3 results to our format
    const detectionResults: LanguageDetectionResult[] = results
      .filter((r) => r.language !== "und") // Filter out undetermined
      .map((r) => ({
        detectedLanguage: r.language,
        confidence: r.probability,
      }))
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence descending

    // Return at least one result
    if (detectionResults.length === 0) {
      return [{ detectedLanguage: "und", confidence: 0 }];
    }

    return detectionResults;
  } finally {
    identifier.dispose();
  }
}

/**
 * Get the primary detected language using CLD3
 */
export async function detectPrimaryLanguage(
  text: string
): Promise<LanguageResult> {
  const factory = await initCld3();
  const identifier = factory.create(0, 1000);

  try {
    return identifier.findLanguage(text);
  } finally {
    identifier.dispose();
  }
}

/**
 * Dispose of the CLD3 factory (cleanup)
 */
export function disposeCld3(): void {
  if (cldFactory) {
    cldFactory = null;
    loadingPromise = null;
  }
}
