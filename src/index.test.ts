import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  LanguageDetector,
  installPolyfill,
  isNativeAPIAvailable,
  getSupportedLanguages,
  isLanguageSupported,
  analyzeScripts,
  extractTrigrams,
} from "./index";

describe("LanguageDetector", () => {
  let detector: LanguageDetector;

  beforeEach(async () => {
    detector = await LanguageDetector.create();
  });

  afterEach(() => {
    detector.destroy();
  });

  describe("create()", () => {
    it("should create a new instance", async () => {
      const instance = await LanguageDetector.create();
      expect(instance).toBeInstanceOf(LanguageDetector);
      instance.destroy();
    });

    it("should accept expectedInputLanguages option", async () => {
      const instance = await LanguageDetector.create({
        expectedInputLanguages: ["en", "de", "fr"],
      });
      expect(instance.expectedInputLanguages).toEqual(["en", "de", "fr"]);
      instance.destroy();
    });

    it("should handle abort signal", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        LanguageDetector.create({ signal: controller.signal })
      ).rejects.toThrow("aborted");
    });
  });

  describe("availability()", () => {
    it('should return "available" for supported languages', async () => {
      const status = await LanguageDetector.availability({
        expectedInputLanguages: ["en", "de"],
      });
      expect(status).toBe("available");
    });

    it('should return "unavailable" for mostly unsupported languages', async () => {
      const status = await LanguageDetector.availability({
        expectedInputLanguages: ["xyz", "abc", "qqq"],
      });
      expect(status).toBe("unavailable");
    });

    it('should return "available" with no options', async () => {
      const status = await LanguageDetector.availability();
      expect(status).toBe("available");
    });
  });

  describe("detect()", () => {
    it("should detect English text", async () => {
      const results = await detector.detect(
        "The quick brown fox jumps over the lazy dog. This is a longer English sentence for better detection accuracy."
      );
      expect(results[0].detectedLanguage).toBe("en");
      expect(results[0].confidence).toBeGreaterThan(0.05);
    });

    it("should detect German text", async () => {
      const results = await detector.detect(
        "Das ist ein deutscher Satz mit mehreren Wörtern und noch mehr deutschem Text für bessere Erkennung."
      );
      expect(results[0].detectedLanguage).toBe("de");
      expect(results[0].confidence).toBeGreaterThan(0.05);
    });

    it("should detect French text", async () => {
      const results = await detector.detect(
        "Bonjour le monde, c'est une belle journée aujourd'hui. Je suis très content de vous parler en français."
      );
      expect(results[0].detectedLanguage).toBe("fr");
      expect(results[0].confidence).toBeGreaterThan(0.05);
    });

    it("should detect Spanish text", async () => {
      const results = await detector.detect(
        "Hola mundo, este es un texto en español con muchas palabras. Estoy muy contento de hablar español hoy."
      );
      expect(results[0].detectedLanguage).toBe("es");
      expect(results[0].confidence).toBeGreaterThan(0.05);
    });

    it("should detect Italian text", async () => {
      const results = await detector.detect(
        "Ciao mondo, questo è un testo in italiano. Sono molto felice di parlare italiano oggi con voi."
      );
      expect(results[0].detectedLanguage).toBe("it");
      expect(results[0].confidence).toBeGreaterThan(0.05);
    });

    it("should detect Portuguese text", async () => {
      const results = await detector.detect(
        "Olá mundo, este é um texto em português. Estou muito feliz de falar português hoje com vocês."
      );
      expect(results[0].detectedLanguage).toBe("pt");
      expect(results[0].confidence).toBeGreaterThan(0.05);
    });

    it("should detect Ukrainian text (Cyrillic)", async () => {
      const results = await detector.detect(
        "Привіт світ, це текст українською мовою. Я дуже радий говорити українською сьогодні."
      );
      expect(results[0].detectedLanguage).toBe("uk");
      expect(results[0].confidence).toBeGreaterThan(0.05);
    });

    it("should detect Chinese text", async () => {
      const results = await detector.detect("你好世界，这是中文文本。");
      expect(results[0].detectedLanguage).toBe("zh");
      expect(results[0].confidence).toBeGreaterThan(0.1);
    });

    it("should detect Japanese text", async () => {
      const results = await detector.detect(
        "こんにちは世界、これは日本語のテキストです。"
      );
      expect(results[0].detectedLanguage).toBe("ja");
      expect(results[0].confidence).toBeGreaterThan(0.1);
    });

    it("should detect Korean text", async () => {
      const results = await detector.detect(
        "안녕하세요 세계, 이것은 한국어 텍스트입니다."
      );
      expect(results[0].detectedLanguage).toBe("ko");
      expect(results[0].confidence).toBeGreaterThan(0.1);
    });

    it("should detect Arabic text", async () => {
      const results = await detector.detect("مرحبا بالعالم، هذا نص عربي.");
      expect(results[0].detectedLanguage).toBe("ar");
      expect(results[0].confidence).toBeGreaterThan(0.1);
    });

    it("should return multiple results sorted by confidence", async () => {
      const results = await detector.detect("Hello world");
      expect(results.length).toBeGreaterThan(1);
      expect(results[0].confidence).toBeGreaterThanOrEqual(
        results[1].confidence
      );
    });

    it("should handle empty text", async () => {
      const results = await detector.detect("");
      expect(results[0].detectedLanguage).toBe("und");
      expect(results[0].confidence).toBe(0);
    });

    it("should throw on non-string input", async () => {
      await expect(detector.detect(123 as unknown as string)).rejects.toThrow(
        TypeError
      );
    });

    it("should respect expectedInputLanguages", async () => {
      const limitedDetector = await LanguageDetector.create({
        expectedInputLanguages: ["de", "fr"],
      });

      const results = await limitedDetector.detect("Hello world");
      // Should only return de or fr
      expect(["de", "fr"]).toContain(results[0].detectedLanguage);
      limitedDetector.destroy();
    });
  });

  describe("measureInputUsage()", () => {
    it("should return text length", async () => {
      const text = "Hello, world!";
      const usage = await detector.measureInputUsage(text);
      expect(usage).toBe(text.length);
    });

    it("should throw on non-string input", async () => {
      await expect(
        detector.measureInputUsage(123 as unknown as string)
      ).rejects.toThrow(TypeError);
    });
  });

  describe("destroy()", () => {
    it("should prevent further operations", async () => {
      const instance = await LanguageDetector.create();
      instance.destroy();

      await expect(instance.detect("test")).rejects.toThrow("destroyed");
    });
  });

  describe("inputQuota", () => {
    it("should return initial quota", () => {
      expect(detector.inputQuota).toBe(10000);
    });

    it("should decrease after detection", async () => {
      const initialQuota = detector.inputQuota;
      await detector.detect("Hello world");
      expect(detector.inputQuota).toBeLessThan(initialQuota);
    });
  });
});

describe("Utility functions", () => {
  describe("getSupportedLanguages()", () => {
    it("should return array of language codes", () => {
      const languages = getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain("en");
      expect(languages).toContain("de");
      expect(languages).toContain("fr");
      expect(languages).toContain("zh");
      expect(languages).toContain("ja");
    });
  });

  describe("isLanguageSupported()", () => {
    it("should return true for supported languages", () => {
      expect(isLanguageSupported("en")).toBe(true);
      expect(isLanguageSupported("en-US")).toBe(true);
      expect(isLanguageSupported("de")).toBe(true);
    });

    it("should return false for unsupported languages", () => {
      expect(isLanguageSupported("xyz")).toBe(false);
    });
  });

  describe("analyzeScripts()", () => {
    it("should detect Latin script", () => {
      const scripts = analyzeScripts("Hello world");
      expect(scripts[0].script).toBe("Latin");
    });

    it("should detect Cyrillic script", () => {
      const scripts = analyzeScripts("Привет мир");
      expect(scripts[0].script).toBe("Cyrillic");
    });

    it("should detect Han script", () => {
      const scripts = analyzeScripts("你好世界");
      expect(scripts[0].script).toBe("Han");
    });

    it("should detect mixed scripts", () => {
      const scripts = analyzeScripts("Hello 世界");
      expect(scripts.length).toBe(2);
    });
  });

  describe("extractTrigrams()", () => {
    it("should extract trigrams from text", () => {
      const trigrams = extractTrigrams("hello");
      expect(trigrams.has("hel")).toBe(true);
      expect(trigrams.has("ell")).toBe(true);
      expect(trigrams.has("llo")).toBe(true);
    });

    it("should normalize to lowercase", () => {
      const trigrams = extractTrigrams("HELLO");
      expect(trigrams.has("hel")).toBe(true);
    });
  });
});

describe("Polyfill installation", () => {
  afterEach(() => {
    // Clean up global
    delete (globalThis as { LanguageDetector?: unknown }).LanguageDetector;
  });

  describe("isNativeAPIAvailable()", () => {
    it("should return false when not available", () => {
      expect(isNativeAPIAvailable()).toBe(false);
    });
  });

  describe("installPolyfill()", () => {
    it("should install polyfill globally", () => {
      const result = installPolyfill();
      expect(result).toBe(true);
      expect(
        (globalThis as { LanguageDetector?: unknown }).LanguageDetector
      ).toBe(LanguageDetector);
    });

    it("should not overwrite existing without force", () => {
      (globalThis as { LanguageDetector?: unknown }).LanguageDetector =
        function FakeDetector() {} as unknown as typeof LanguageDetector;

      const result = installPolyfill();
      expect(result).toBe(false);
    });

    it("should overwrite existing with force", () => {
      (globalThis as { LanguageDetector?: unknown }).LanguageDetector =
        function FakeDetector() {} as unknown as typeof LanguageDetector;

      const result = installPolyfill(true);
      expect(result).toBe(true);
      expect(
        (globalThis as { LanguageDetector?: unknown }).LanguageDetector
      ).toBe(LanguageDetector);
    });
  });
});
