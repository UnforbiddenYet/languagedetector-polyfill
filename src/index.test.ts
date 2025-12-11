import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import {
  LanguageDetector,
  installPolyfill,
  isNativeAPIAvailable,
} from "./index";

let wasmInitializingDetector: LanguageDetector;

// Initialize CLD3 before all tests
beforeAll(async () => {
  wasmInitializingDetector = await LanguageDetector.create();
}, 30000); // 30 second timeout for WASM load

afterAll(() => {
  wasmInitializingDetector.destroy();
});

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
    it('should return "available" or "downloadable" for supported languages', async () => {
      const status = await LanguageDetector.availability({
        expectedInputLanguages: ["en", "de"],
      });
      expect(["available", "downloadable"]).toContain(status);
    });

    it('should return "unavailable" for mostly unsupported languages', async () => {
      const status = await LanguageDetector.availability({
        expectedInputLanguages: ["xyz", "abc", "qqq"],
      });
      expect(status).toBe("unavailable");
    });

    it('should return "available" or "downloadable" with no options', async () => {
      const status = await LanguageDetector.availability();
      expect(["available", "downloadable"]).toContain(status);
    });
  });

  describe("detect()", () => {
    it("should detect English text", async () => {
      const results = await detector.detect(
        "The quick brown fox jumps over the lazy dog. This is a longer English sentence for better detection accuracy."
      );
      expect(results[0].detectedLanguage).toBe("en");
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it("should detect German text", async () => {
      const results = await detector.detect(
        "Das ist ein deutscher Satz mit mehreren Wörtern und noch mehr deutschem Text für bessere Erkennung."
      );
      expect(results[0].detectedLanguage).toBe("de");
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it("should detect French text", async () => {
      const results = await detector.detect("Bonjour le monde!");
      expect(results[0].detectedLanguage).toBe("fr");
      expect(results[0].confidence).toBeGreaterThan(0.9);
    });

    it("should detect Spanish text", async () => {
      const results = await detector.detect(
        "Hola mundo, este es un texto en español con muchas palabras. Estoy muy contento de hablar español hoy."
      );
      expect(results[0].detectedLanguage).toBe("es");
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it("should detect Italian text", async () => {
      const results = await detector.detect(
        "Ciao mondo, questo è un testo in italiano. Sono molto felice di parlare italiano oggi con voi."
      );
      expect(results[0].detectedLanguage).toBe("it");
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it("should detect Portuguese text", async () => {
      const results = await detector.detect(
        "Olá mundo, este é um texto em português. Estou muito feliz de falar português hoje com vocês."
      );
      expect(results[0].detectedLanguage).toBe("pt");
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it("should detect Ukrainian text (Cyrillic)", async () => {
      const results = await detector.detect(
        "Привіт світ, це текст українською мовою. Я дуже радий говорити українською сьогодні."
      );
      expect(results[0].detectedLanguage).toBe("uk");
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it("should detect Chinese text", async () => {
      const results = await detector.detect(
        "你好世界，这是中文文本。这是一段较长的中文文字。"
      );
      expect(results[0].detectedLanguage).toBe("zh");
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it("should detect Japanese text", async () => {
      const results = await detector.detect(
        "こんにちは世界、これは日本語のテキストです。今日はとても良い日です。"
      );
      expect(results[0].detectedLanguage).toBe("ja");
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it("should detect Korean text", async () => {
      const results = await detector.detect(
        "안녕하세요 세계, 이것은 한국어 텍스트입니다. 오늘 정말 좋은 날이에요."
      );
      expect(results[0].detectedLanguage).toBe("ko");
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it("should detect Arabic text", async () => {
      const results = await detector.detect(
        "مرحبا بالعالم، هذا نص عربي. أنا سعيد جداً بالتحدث بالعربية اليوم."
      );
      expect(results[0].detectedLanguage).toBe("ar");
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it("should return multiple results sorted by confidence", async () => {
      const results = await detector.detect(
        "Привіт світ, це текст українською мовою. こんにちは世界、これは日本語のテキストです。今日はとても良い日です。"
      );
      expect(results.length).toBe(2);
      expect(results[0].detectedLanguage).toBe("ja");
      expect(results[1].detectedLanguage).toBe("uk");
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

    it("should use expectedInputLanguages as optimization hint only", async () => {
      const detector = await LanguageDetector.create({
        expectedInputLanguages: ["de", "fr"],
      });

      // Should still detect English correctly even though it's not in expectedInputLanguages
      const results = await detector.detect(
        "Hello world, this is English text"
      );
      expect(results[0].detectedLanguage).toBe("en");

      detector.destroy();
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
