import type {
  LanguageDetectionResult,
  LanguageDetectorCreateOptions,
  LanguageDetectorAvailabilityOptions,
  AvailabilityStatus,
} from "./types";
import {
  detectWithCld3,
  initCld3,
  isCld3Ready,
  disposeCld3,
  CLD3_SUPPORTED_LANGUAGES,
} from "./cld3-engine";

/**
 * LanguageDetector polyfill implementing the Web API specification.
 * Uses Google's CLD3 neural network model via WebAssembly for language detection.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetector
 */
export class LanguageDetector {
  #destroyed = false;
  #expectedInputLanguages: readonly string[];
  #inputQuota: number;

  /**
   * Private constructor - use LanguageDetector.create() instead
   */
  private constructor(options?: LanguageDetectorCreateOptions) {
    this.#expectedInputLanguages = Object.freeze(
      options?.expectedInputLanguages?.slice() ?? []
    );
    // Simulated quota (in practice, this would be based on model limits)
    this.#inputQuota = 10000;
  }

  /**
   * The input quota available to the browser for detecting languages.
   * @readonly
   */
  get inputQuota(): number {
    this.#checkDestroyed();
    return this.#inputQuota;
  }

  /**
   * The expected languages to be detected in the input text.
   * @readonly
   */
  get expectedInputLanguages(): readonly string[] {
    this.#checkDestroyed();
    return this.#expectedInputLanguages;
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
    // Check if expected languages are supported by CLD3
    if (options?.expectedInputLanguages) {
      const unsupported = options.expectedInputLanguages.filter((lang) => {
        const normalizedLang = lang.split("-")[0].toLowerCase();
        return !CLD3_SUPPORTED_LANGUAGES.has(normalizedLang);
      });

      // If more than half are unsupported, return unavailable
      if (unsupported.length > options.expectedInputLanguages.length / 2) {
        return "unavailable";
      }
    }

    // Check if CLD3 is already loaded
    if (isCld3Ready()) {
      return "available";
    }

    // CLD3 WASM needs to be loaded
    return "downloadable";
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
      throw new DOMException(
        "Language detector creation aborted",
        "AbortError"
      );
    }

    // Set up progress monitoring
    let progressCallback: ((loaded: number, total: number) => void) | null =
      null;

    if (options?.monitor) {
      const listeners: Array<
        (event: { loaded: number; total: number }) => void
      > = [];
      const monitor = {
        addEventListener(
          _type: "downloadprogress",
          listener: (event: { loaded: number; total: number }) => void
        ) {
          listeners.push(listener);
        },
      };

      options.monitor(monitor);

      progressCallback = (loaded: number, total: number) => {
        listeners.forEach((listener) => listener({ loaded, total }));
      };
    }

    // Initialize CLD3 WASM module
    if (!isCld3Ready()) {
      // Report download starting
      progressCallback?.(0, 1);

      try {
        await initCld3();
      } catch (error) {
        throw new DOMException(
          `Failed to initialize language detector: ${error}`,
          "OperationError"
        );
      }

      // Report download complete
      progressCallback?.(1, 1);
    } else {
      // Already loaded
      progressCallback?.(1, 1);
    }

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
    this.#checkDestroyed();

    if (typeof text !== "string") {
      throw new TypeError("Input must be a string");
    }

    // Handle empty text
    if (text.trim().length === 0) {
      return [{ detectedLanguage: "und", confidence: 0 }];
    }

    // Update quota usage
    this.#inputQuota = Math.max(0, this.#inputQuota - text.length);

    // Use CLD3 neural network for detection
    // Note: expectedInputLanguages is stored for API compatibility but doesn't affect detection
    return detectWithCld3(text);
  }

  /**
   * Measure how much input quota would be consumed by detecting the given text.
   *
   * @param text - The text to measure
   * @returns Promise resolving to the quota usage amount
   */
  async measureInputUsage(text: string): Promise<number> {
    this.#checkDestroyed();

    if (typeof text !== "string") {
      throw new TypeError("Input must be a string");
    }

    // In this polyfill, quota usage is simply the text length
    return text.length;
  }

  /**
   * Release resources and stop any further activity.
   * Call this when you're done using the detector.
   */
  destroy(): void {
    this.#destroyed = true;
    disposeCld3();
  }

  /**
   * Check if the detector has been destroyed
   */
  #checkDestroyed(): void {
    if (this.#destroyed) {
      throw new DOMException(
        "LanguageDetector has been destroyed",
        "InvalidStateError"
      );
    }
  }
}
