/**
 * LanguageDetector Web API Polyfill
 *
 * A polyfill for the experimental LanguageDetector Web API that uses
 * Google's CLD3 (Compact Language Detector v3) neural network model
 * via WebAssembly for accurate language detection.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetector
 *
 * @example
 * ```js
 * import { LanguageDetector, installPolyfill } from 'language-detector-polyfill';
 *
 * // Install globally (optional)
 * installPolyfill();
 *
 * // Use the API
 * const detector = await LanguageDetector.create();
 * const results = await detector.detect("Bonjour le monde!");
 * console.log(results[0].detectedLanguage); // "fr"
 * ```
 */

export { LanguageDetector } from "./language-detector";
export type {
  LanguageDetectionResult,
  LanguageDetectorCreateOptions,
  LanguageDetectorAvailabilityOptions,
  AvailabilityStatus,
} from "./types";

import { LanguageDetector } from "./language-detector";

/**
 * Check if the native LanguageDetector API is available
 */
export function isNativeAPIAvailable(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "LanguageDetector" in globalThis &&
    typeof (globalThis as typeof globalThis & { LanguageDetector?: unknown })
      .LanguageDetector === "function"
  );
}

/**
 * Install the polyfill globally on `globalThis.LanguageDetector`
 *
 * @param force - If true, overwrite existing native implementation
 * @returns true if polyfill was installed, false if native API exists and force=false
 *
 * @example
 * ```js
 * import { installPolyfill } from 'language-detector-polyfill';
 *
 * // Only install if native API is not available
 * installPolyfill();
 *
 * // Force install even if native API exists
 * installPolyfill(true);
 *
 * // Now use the global API
 * const detector = await LanguageDetector.create();
 * ```
 */
export function installPolyfill(force = false): boolean {
  if (typeof globalThis === "undefined") {
    return false;
  }

  if (!force && isNativeAPIAvailable()) {
    return false;
  }

  (
    globalThis as typeof globalThis & {
      LanguageDetector: typeof LanguageDetector;
    }
  ).LanguageDetector = LanguageDetector;
  return true;
}

/**
 * Automatically install polyfill if native API is not available
 * This is useful for automatic polyfilling in script tags
 */
export function autoInstall(): void {
  if (!isNativeAPIAvailable()) {
    installPolyfill();
  }
}

// Default export for convenience
export default LanguageDetector;
