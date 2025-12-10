# LanguageDetector Polyfill

A polyfill for the [LanguageDetector Web API](https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetector) that provides CLD3-like language detection using trigram analysis and Unicode script detection.

## Features

- Full implementation of the LanguageDetector Web API specification
- CLD3-like detection using trigram frequency analysis
- Unicode script detection for non-Latin languages (Chinese, Japanese, Korean, Arabic, etc.)
- Supports 40+ languages out of the box
- Zero dependencies
- TypeScript support with full type definitions
- Works in browsers and Node.js
- Lightweight (~15KB minified)

## Installation

```bash
npm install language-detector-polyfill
```

## Usage

### Basic Usage

```javascript
import { LanguageDetector } from 'language-detector-polyfill';

// Create a detector instance
const detector = await LanguageDetector.create();

// Detect language
const results = await detector.detect('Bonjour le monde!');
console.log(results[0].detectedLanguage); // "fr"
console.log(results[0].confidence);       // 0.85

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
  expectedInputLanguages: ['en', 'de', 'fr']
});

if (availability === 'available') {
  const detector = await LanguageDetector.create({
    expectedInputLanguages: ['en', 'de', 'fr']
  });
  // Use detector...
}
```

### With Expected Languages

Limit detection to specific languages for better performance and accuracy:

```javascript
const detector = await LanguageDetector.create({
  expectedInputLanguages: ['en', 'es', 'fr', 'de']
});

// Detection will only consider these four languages
const results = await detector.detect('This is English text');
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

### `LanguageDetector.availability(options?)`

Check if the detector is available for a given configuration.

**Parameters:**
- `options.expectedInputLanguages` (string[]): Expected input language codes

**Returns:** `Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>`

### `LanguageDetector.create(options?)`

Create a new LanguageDetector instance.

**Parameters:**
- `options.expectedInputLanguages` (string[]): Limit detection to these languages
- `options.signal` (AbortSignal): Cancel creation
- `options.monitor` (function): Download progress callback (for API compatibility)

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

Array of expected input language codes.

## Supported Languages

| Code | Language | Script |
|------|----------|--------|
| en | English | Latin |
| de | German | Latin |
| fr | French | Latin |
| es | Spanish | Latin |
| it | Italian | Latin |
| pt | Portuguese | Latin |
| nl | Dutch | Latin |
| pl | Polish | Latin |
| uk | Ukrainian | Cyrillic |
| zh | Chinese | Han |
| ja | Japanese | Hiragana/Katakana/Han |
| ko | Korean | Hangul |
| ar | Arabic | Arabic |
| he | Hebrew | Hebrew |
| hi | Hindi | Devanagari |
| th | Thai | Thai |
| vi | Vietnamese | Latin |
| tr | Turkish | Latin |
| ... | [40+ languages] | ... |

## How It Works

This polyfill uses techniques similar to Google's [CLD3 (Compact Language Detector v3)](https://github.com/ArtVladimir/CLD3):

1. **Script Detection**: First identifies the Unicode script(s) used in the text (Latin, Cyrillic, Han, etc.)

2. **Trigram Analysis**: Extracts character trigrams from the input text and compares them against pre-computed language profiles

3. **Confidence Scoring**: Uses a softmax-like normalization to convert raw scores into confidence values

4. **Script Boosting**: Languages matching the detected script receive a confidence boost

## Comparison with Native API

| Feature | Native API | Polyfill |
|---------|------------|----------|
| Model | On-device AI (CLD3) | Trigram analysis |
| Privacy | Full | Full (no network) |
| Accuracy | Very High | High |
| Size | ~1MB (downloaded) | ~15KB |
| Speed | Fast | Very Fast |
| Languages | Browser-dependent | 40+ |

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

MIT
