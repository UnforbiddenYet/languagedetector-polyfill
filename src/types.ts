/**
 * Result of language detection for a piece of text
 */
export interface LanguageDetectionResult {
  /** BCP 47 language tag (e.g., "en", "uk", "zh") */
  detectedLanguage: string;
  /** Confidence score between 0 and 1 */
  confidence: number;
}

/**
 * Options for creating a LanguageDetector instance
 */
export interface LanguageDetectorCreateOptions {
  /** Array of BCP 47 language tags for expected input languages */
  expectedInputLanguages?: string[];
  /** Monitor for download progress (for API compatibility, not used in polyfill) */
  monitor?: (monitor: DownloadMonitor) => void;
  /** AbortSignal to cancel the creation */
  signal?: AbortSignal;
}

/**
 * Options for checking availability
 */
export interface LanguageDetectorAvailabilityOptions {
  /** Array of BCP 47 language tags for expected input languages */
  expectedInputLanguages?: string[];
}

/**
 * Availability status of the language detector
 */
export type AvailabilityStatus =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable";

/**
 * Download progress event
 */
export interface DownloadProgressEvent {
  loaded: number;
  total: number;
}

/**
 * Download progress monitor interface
 */
export interface DownloadMonitor {
  addEventListener(
    type: "downloadprogress",
    listener: (event: DownloadProgressEvent) => void
  ): void;
}
