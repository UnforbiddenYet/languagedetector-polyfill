import type { LanguageDetector } from './language-detector';

declare global {
  /**
   * Global LanguageDetector interface when polyfill is installed
   */
  interface Window {
    LanguageDetector?: typeof LanguageDetector;
  }

  /**
   * Global LanguageDetector interface for non-browser environments
   */
  var LanguageDetector: typeof LanguageDetector | undefined;
}

export {};
