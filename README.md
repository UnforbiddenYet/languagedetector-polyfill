# LanguageDetector Polyfill

A polyfill for the [LanguageDetector Web API](https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetector) that uses Google's [CLD3 (Compact Language Detector v3)](https://github.com/google/cld3) neural network model via [WebAssembly cld3 binary](github.com/kwonoj/cld3-asm) for accurate language detection.

## Features

- Browser-agnostic implementation of the LanguageDetector Web API specification
- Uses Google's CLD3 neural network model (same as Chrome's built-in detector)
- WebAssembly-based for high performance
- Supports 104 languages (see [CLD3 supported languages](https://github.com/google/cld3#supported-languages))
- TypeScript support with full type definitions
- Works in browsers and Node.js

## Installation

```bash
npm install language-detector-polyfill
```

## Usage

### Basic Usage

```javascript
import { LanguageDetector } from 'language-detector-polyfill';

// Create a detector instance (loads CLD3 WASM on first use)
const detector = await LanguageDetector.create();

// Detect language
const results = await detector.detect('Bonjour le monde!');
console.log(results[0].detectedLanguage); // "fr"
console.log(results[0].confidence);       // 0.99

// Clean up when done
detector.destroy();
```

### Install as Global Polyfill

```javascript
import { installPolyfill } from 'language-detector-polyfill';

// Install globally (only if native API is not available)
installPolyfill();

// Now use the standard Web API
const detector = await LanguageDetector.create();
const results = await detector.detect('Hello world');
```

### Check Availability

```javascript
import { LanguageDetector } from 'language-detector-polyfill';

const availability = await LanguageDetector.availability({
  expectedInputLanguages: ['en', 'uk', 'ja']
});

if (availability === 'available' || availability === 'downloadable') {
  const detector = await LanguageDetector.create({
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (e) => {
        console.log(`Loading: ${Math.floor(e.loaded * 100)}%`);
      });
    }
  });
  // Use detector...
}
```

### With Expected Languages

**Important:** Per the [Web API specification](https://webmachinelearning.github.io/translation-api/#language-detector-language-detection), `expectedInputLanguages` is used as an optimization hint during model initialization. The CLD3 WASM module loads all languages at once, so this `expectedInputLanguages` API is provided for compatibility but doesn't affect detection.

```javascript
const detector = await LanguageDetector.create({
  expectedInputLanguages: ['en', 'es', 'fr', 'de']
});
```

### Script Tag (Auto-Install)

```html
<script type="module">
  import { autoInstall } from 'https://unpkg.com/language-detector-polyfill';
  autoInstall();

  // Now LanguageDetector is available globally
  const detector = await LanguageDetector.create();
</script>
```

## API Reference

Follows [LanguageDetector Web API](https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetector)

### `LanguageDetector.availability(options?)`

Check if the detector is available for a given configuration.

**Parameters:**
- `options.expectedInputLanguages` (string[]): Expected input language codes 

**Returns:** `Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>`

### `LanguageDetector.create(options?)`

Create a new LanguageDetector instance.

**Parameters:**
- `options.expectedInputLanguages` (string[]): Optimization hint for expected input languages (provided for compatibility only, it doesn't affect detection)
- `options.signal` (AbortSignal): Cancel creation
- `options.monitor` (function): Download progress callback

**Returns:** `Promise<LanguageDetector>`

### `detector.detect(text)`

Detect the language(s) of the provided text.

**Parameters:**
- `text` (string): Text to analyze

**Returns:** `Promise<LanguageDetectionResult[]>`

```typescript
interface LanguageDetectionResult {
  detectedLanguage: string;  // BCP 47 language code
  confidence: number;        // 0-1 confidence score
}
```

### `detector.measureInputUsage(text)`

Measure how much input quota would be used.

**Returns:** `Promise<number>`

### `detector.destroy()`

Release resources. Call when done using the detector.

### `detector.inputQuota` (readonly)

Available input quota for detection operations.

### `detector.expectedInputLanguages` (readonly)

Array of expected input language codes (optimization hint only, does not affect detection results).

### `LanguageDetector.dispose()`

Static method to cleanup CLD3 resources globally.

## Supported Languages

CLD3 supports **104 languages** with BCP-47 language codes. For the complete list, see [CLD3 Supported Languages](https://github.com/google/cld3#supported-languages).

## How It Works

This polyfill uses [cld3-asm](github.com/kwonoj/cld3-asm), a WebAssembly port of Google's CLD3:

1. **Neural Network Model**: CLD3 uses a neural network trained on text from the web to identify languages

2. **On-Device Processing**: All detection runs locally in WebAssembly - no data is sent to any server

3. **High Accuracy**: The same model used in Chrome's built-in LanguageDetector API

4. **Lazy Loading**: The WASM binary (~1MB) is loaded on first use

## Comparison with Native API

| Feature | Native API | Polyfill |
|---------|------------|----------|
| Model | CLD3 (on-device) | CLD3 (WASM) |
| Privacy | Full | Full (no network) |
| Accuracy | Very High | Very High (same model) |
| Size | ~1MB (system) | ~1MB (downloaded) |
| Languages | 104 | 104 |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Watch mode
npm run dev
```

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+
- Node.js 16+

## License

# License

- language-detector-polyfill: [MIT](https://github.com/unforbiddenyet/language-detector-polyfill/blob/master/LICENSE)
- cld3-asm: [MIT](https://github.com/kwonoj/cld3-asm/blob/master/LICENSE)
- cld3: [original license](https://github.com/google/cld3/blob/master/LICENSE)

## Credits

- [CLD3](github.com/google/cld3) - Google's Compact Language Detector v3 (CLD3)
- [cld3-asm](github.com/kwonoj/cld3-asm) - WebAssembly port of CLD3
