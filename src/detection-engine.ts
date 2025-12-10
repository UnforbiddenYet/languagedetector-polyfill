import type {
  LanguageDetectionResult,
  LanguageProfile,
  ScriptInfo,
} from './types';
import { languageProfiles, languageProfileMap } from './language-profiles';

/**
 * Unicode script ranges for script detection
 */
const SCRIPT_RANGES: Record<string, [number, number][]> = {
  Latin: [
    [0x0041, 0x007a], // Basic Latin
    [0x00c0, 0x00ff], // Latin-1 Supplement
    [0x0100, 0x017f], // Latin Extended-A
    [0x0180, 0x024f], // Latin Extended-B
    [0x1e00, 0x1eff], // Latin Extended Additional
  ],
  Cyrillic: [
    [0x0400, 0x04ff], // Cyrillic
    [0x0500, 0x052f], // Cyrillic Supplement
  ],
  Greek: [[0x0370, 0x03ff]],
  Arabic: [
    [0x0600, 0x06ff], // Arabic
    [0x0750, 0x077f], // Arabic Supplement
    [0x08a0, 0x08ff], // Arabic Extended-A
    [0xfb50, 0xfdff], // Arabic Presentation Forms-A
    [0xfe70, 0xfeff], // Arabic Presentation Forms-B
  ],
  Hebrew: [[0x0590, 0x05ff]],
  Devanagari: [[0x0900, 0x097f]],
  Bengali: [[0x0980, 0x09ff]],
  Tamil: [[0x0b80, 0x0bff]],
  Thai: [[0x0e00, 0x0e7f]],
  Han: [
    [0x4e00, 0x9fff], // CJK Unified Ideographs
    [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
    [0x20000, 0x2a6df], // CJK Unified Ideographs Extension B
    [0xf900, 0xfaff], // CJK Compatibility Ideographs
  ],
  Hiragana: [[0x3040, 0x309f]],
  Katakana: [
    [0x30a0, 0x30ff],
    [0x31f0, 0x31ff],
  ],
  Hangul: [
    [0xac00, 0xd7af], // Hangul Syllables
    [0x1100, 0x11ff], // Hangul Jamo
    [0x3130, 0x318f], // Hangul Compatibility Jamo
  ],
};

/**
 * Detect the Unicode script of a character
 */
function getCharacterScript(char: string): string | null {
  const code = char.codePointAt(0);
  if (code === undefined) return null;

  for (const [script, ranges] of Object.entries(SCRIPT_RANGES)) {
    for (const [start, end] of ranges) {
      if (code >= start && code <= end) {
        return script;
      }
    }
  }
  return null;
}

/**
 * Analyze the scripts present in a text
 */
export function analyzeScripts(text: string): ScriptInfo[] {
  const scriptCounts = new Map<string, number>();
  let totalScriptChars = 0;

  for (const char of text) {
    const script = getCharacterScript(char);
    if (script) {
      scriptCounts.set(script, (scriptCounts.get(script) || 0) + 1);
      totalScriptChars++;
    }
  }

  const results: ScriptInfo[] = [];
  for (const [script, count] of scriptCounts) {
    results.push({
      script,
      count,
      ratio: totalScriptChars > 0 ? count / totalScriptChars : 0,
    });
  }

  return results.sort((a, b) => b.count - a.count);
}

/**
 * Extract trigrams from text
 */
export function extractTrigrams(text: string): Map<string, number> {
  const trigrams = new Map<string, number>();
  const normalized = text
    .toLowerCase()
    .replace(/[0-9]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.substring(i, i + 3);
    // Skip trigrams with multiple spaces
    if (trigram.includes('  ')) continue;
    trigrams.set(trigram, (trigrams.get(trigram) || 0) + 1);
  }

  return trigrams;
}

/**
 * Calculate similarity score between text trigrams and a language profile
 */
function calculateTrigramScore(
  textTrigrams: Map<string, number>,
  profile: LanguageProfile
): number {
  let score = 0;
  const profileTrigramSet = new Set(profile.trigrams);
  const totalTextTrigrams = Array.from(textTrigrams.values()).reduce(
    (a, b) => a + b,
    0
  );

  if (totalTextTrigrams === 0) return 0;

  // Score based on how many profile trigrams appear in the text
  for (const [trigram, count] of textTrigrams) {
    if (profileTrigramSet.has(trigram)) {
      // Weight by position in profile (earlier = more common = higher weight)
      const profileIndex = profile.trigrams.indexOf(trigram);
      const positionWeight = 1 - profileIndex / profile.trigrams.length;
      score += (count / totalTextTrigrams) * positionWeight;
    }
  }

  return score;
}

/**
 * Filter profiles by script compatibility
 */
function filterProfilesByScript(
  profiles: LanguageProfile[],
  scripts: ScriptInfo[]
): LanguageProfile[] {
  if (scripts.length === 0) return profiles;

  const dominantScript = scripts[0];
  // If there's a dominant script (>50% of characters), filter by it
  if (dominantScript.ratio > 0.5) {
    const filtered = profiles.filter((p) =>
      p.scripts.includes(dominantScript.script)
    );
    // Return filtered if we have matches, otherwise return all
    return filtered.length > 0 ? filtered : profiles;
  }

  return profiles;
}

/**
 * Core language detection engine using CLD3-like trigram analysis
 */
export function detectLanguage(
  text: string,
  expectedLanguages?: string[]
): LanguageDetectionResult[] {
  // Normalize and validate input
  const normalizedText = text.trim();
  if (normalizedText.length === 0) {
    return [{ detectedLanguage: 'und', confidence: 0 }];
  }

  // Analyze scripts in the text
  const scripts = analyzeScripts(normalizedText);

  // Get profiles to evaluate
  let profilesToEvaluate: LanguageProfile[];

  if (expectedLanguages && expectedLanguages.length > 0) {
    // Filter to expected languages
    profilesToEvaluate = expectedLanguages
      .map((lang) => {
        const normalizedLang = lang.split('-')[0].toLowerCase();
        return languageProfileMap.get(normalizedLang);
      })
      .filter((p): p is LanguageProfile => p !== undefined);

    // Fall back to all profiles if none match
    if (profilesToEvaluate.length === 0) {
      profilesToEvaluate = languageProfiles;
    }
  } else {
    profilesToEvaluate = languageProfiles;
  }

  // Filter by script for efficiency
  profilesToEvaluate = filterProfilesByScript(profilesToEvaluate, scripts);

  // Extract trigrams from text
  const textTrigrams = extractTrigrams(normalizedText);

  // Calculate scores for each language
  const scores: { profile: LanguageProfile; score: number }[] = [];

  for (const profile of profilesToEvaluate) {
    // Calculate trigram-based score
    let score = calculateTrigramScore(textTrigrams, profile);

    // Boost score if script matches
    const scriptMatch = scripts.find((s) => profile.scripts.includes(s.script));
    if (scriptMatch) {
      score *= 1 + scriptMatch.ratio * 0.5;
    }

    scores.push({ profile, score });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Convert to confidence values using softmax-like normalization
  const totalScore = scores.reduce((sum, s) => sum + Math.exp(s.score * 10), 0);

  const results: LanguageDetectionResult[] = scores.map(({ profile, score }) => ({
    detectedLanguage: profile.code,
    confidence: totalScore > 0 ? Math.exp(score * 10) / totalScore : 0,
  }));

  // Filter out very low confidence results and limit to top results
  const filtered = results
    .filter((r) => r.confidence > 0.001)
    .slice(0, 10);

  // Ensure we always return at least one result
  if (filtered.length === 0) {
    return [{ detectedLanguage: 'und', confidence: 0 }];
  }

  return filtered;
}

/**
 * Simple script-based detection for CJK and other distinct scripts
 * This provides high confidence for languages with unique scripts
 */
export function detectByScript(text: string): LanguageDetectionResult | null {
  const scripts = analyzeScripts(text);
  if (scripts.length === 0) return null;

  const dominant = scripts[0];
  if (dominant.ratio < 0.7) return null;

  // Map unique scripts to languages
  const scriptToLang: Record<string, string> = {
    Hangul: 'ko',
    Thai: 'th',
    Hebrew: 'he',
    Bengali: 'bn',
    Tamil: 'ta',
    Devanagari: 'hi',
  };

  // Handle Japanese (mix of Hiragana, Katakana, Han)
  const hasHiragana = scripts.some((s) => s.script === 'Hiragana');
  const hasKatakana = scripts.some((s) => s.script === 'Katakana');
  if (hasHiragana || hasKatakana) {
    return {
      detectedLanguage: 'ja',
      confidence: dominant.ratio,
    };
  }

  // Handle Chinese (primarily Han without Japanese scripts)
  if (dominant.script === 'Han') {
    return {
      detectedLanguage: 'zh',
      confidence: dominant.ratio,
    };
  }

  const lang = scriptToLang[dominant.script];
  if (lang) {
    return {
      detectedLanguage: lang,
      confidence: dominant.ratio,
    };
  }

  return null;
}
