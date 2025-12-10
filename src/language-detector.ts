import type {
  LanguageDetectionResult,
  LanguageDetectorCreateOptions,
  LanguageDetectorAvailabilityOptions,
  AvailabilityStatus,
} from './types';
import { detectLanguage, detectByScript } from './detection-engine';
import { isLanguageSupported, getSupportedLanguages } from './language-profiles';

/**
 * LanguageDetector polyfill implementing the Web API specification.
 * Uses CLD3-like trigram analysis for language detection.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetector
 */
export class LanguageDetector {
  private _destroyed = false;
  private _expectedInputLanguages: readonly string[];
  private _inputQuota: number;

  /**
   * Private constructor - use LanguageDetector.create() instead
   */
  private constructor(options?: LanguageDetectorCreateOptions) {
    this._expectedInputLanguages = Object.freeze(
      options?.expectedInputLanguages?.slice() ?? []
    );
    // Simulated quota (in practice, this would be based on model limits)
    this._inputQuota = 10000;
  }

  /**
   * The input quota available to the browser for detecting languages.
   * @readonly
   */
  get inputQuota(): number {
    this.checkDestroyed();
    return this._inputQuota;
  }

  /**
   * The expected languages to be detected in the input text.
   * @readonly
   */
  get expectedInputLanguages(): readonly string[] {
    this.checkDestroyed();
    return this._expectedInputLanguages;
  }

  /**
   * Check the availability of the language detector for a given configuration.
   *
   * @param options - Configuration options to check availability for
   * @returns Promise resolving to availability status
   *
   * @example
   * ```js
   * const availability = await LanguageDetector.availability({
   *   expectedInputLanguages: ["en-US", "zh"]
   * });
   * ```
   */
  static async availability(
    options?: LanguageDetectorAvailabilityOptions
  ): Promise<AvailabilityStatus> {
    // Check if expected languages are supported
    if (options?.expectedInputLanguages) {
      const unsupported = options.expectedInputLanguages.filter(
        (lang) => !isLanguageSupported(lang)
      );

      // If more than half are unsupported, return unavailable
      if (unsupported.length > options.expectedInputLanguages.length / 2) {
        return 'unavailable';
      }
    }

    // Polyfill is always immediately available (no model download needed)
    return 'available';
  }

  /**
   * Create a new LanguageDetector instance.
   *
   * @param options - Configuration options for the detector
   * @returns Promise resolving to a new LanguageDetector instance
   * @throws {DOMException} If aborted via AbortSignal
   *
   * @example
   * ```js
   * const detector = await LanguageDetector.create({
   *   expectedInputLanguages: ["en-US", "zh"]
   * });
   * ```
   */
  static async create(
    options?: LanguageDetectorCreateOptions
  ): Promise<LanguageDetector> {
    // Check for abort signal
    if (options?.signal?.aborted) {
      throw new DOMException('Language detector creation aborted', 'AbortError');
    }

    // Call monitor callback if provided (for API compatibility)
    if (options?.monitor) {
      const listeners: Array<(event: { loaded: number; total: number }) => void> = [];
      const monitor = {
        addEventListener(
          _type: 'downloadprogress',
          listener: (event: { loaded: number; total: number }) => void
        ) {
          listeners.push(listener);
        },
      };

      options.monitor(monitor);

      // Simulate instant download completion
      listeners.forEach((listener) => listener({ loaded: 1, total: 1 }));
    }

    // Simulate async initialization (could be used for lazy loading)
    await Promise.resolve();

    return new LanguageDetector(options);
  }

  /**
   * Detect the language(s) of the provided text.
   *
   * @param text - The text to analyze
   * @returns Promise resolving to an array of detection results sorted by confidence
   *
   * @example
   * ```js
   * const results = await detector.detect("Hello, world!");
   * console.log(results[0].detectedLanguage); // "en"
   * console.log(results[0].confidence); // 0.95
   * ```
   */
  async detect(text: string): Promise<LanguageDetectionResult[]> {
    this.checkDestroyed();

    if (typeof text !== 'string') {
      throw new TypeError('Input must be a string');
    }

    // Update quota usage
    this._inputQuota = Math.max(0, this._inputQuota - text.length);

    // Simulate async operation
    await Promise.resolve();

    // Try script-based detection first for high-confidence results
    const scriptResult = detectByScript(text);
    if (scriptResult && scriptResult.confidence > 0.9) {
      // Still run full detection but boost the script-detected language
      const fullResults = detectLanguage(
        text,
        this._expectedInputLanguages.length > 0
          ? [...this._expectedInputLanguages]
          : undefined
      );

      // Find and boost the script-detected language
      const boostedResults = fullResults.map((r) => {
        if (r.detectedLanguage === scriptResult.detectedLanguage) {
          return {
            ...r,
            confidence: Math.min(1, r.confidence + scriptResult.confidence * 0.3),
          };
        }
        return r;
      });

      // Re-normalize confidences
      const total = boostedResults.reduce((sum, r) => sum + r.confidence, 0);
      return boostedResults
        .map((r) => ({
          ...r,
          confidence: total > 0 ? r.confidence / total : 0,
        }))
        .sort((a, b) => b.confidence - a.confidence);
    }

    // Use trigram-based detection
    return detectLanguage(
      text,
      this._expectedInputLanguages.length > 0
        ? [...this._expectedInputLanguages]
        : undefined
    );
  }

  /**
   * Measure how much input quota would be consumed by detecting the given text.
   *
   * @param text - The text to measure
   * @returns Promise resolving to the quota usage amount
   */
  async measureInputUsage(text: string): Promise<number> {
    this.checkDestroyed();

    if (typeof text !== 'string') {
      throw new TypeError('Input must be a string');
    }

    // In this polyfill, quota usage is simply the text length
    return text.length;
  }

  /**
   * Release resources and stop any further activity.
   * Call this when you're done using the detector.
   */
  destroy(): void {
    this._destroyed = true;
  }

  /**
   * Check if the detector has been destroyed
   */
  private checkDestroyed(): void {
    if (this._destroyed) {
      throw new DOMException(
        'LanguageDetector has been destroyed',
        'InvalidStateError'
      );
    }
  }

  /**
   * Get list of all supported languages
   */
  static getSupportedLanguages(): string[] {
    return getSupportedLanguages();
  }
}
