/**
 * Phonetic Romanized Nepali to Devanagari transliteration engine
 * Supports standard phonetic mappings (e.g., 'ram' -> 'राम', 'shrestha' -> 'श्रेष्ठ', 'nepal' -> 'नेपाल')
 */

const VOWEL_MAP: Record<string, string> = {
  a: 'अ',
  aa: 'आ',
  A: 'आ',
  i: 'इ',
  ee: 'ई',
  I: 'ई',
  u: 'उ',
  oo: 'ऊ',
  U: 'ऊ',
  ri: 'ऋ',
  e: 'ए',
  ai: 'ऐ',
  o: 'ओ',
  au: 'औ',
  am: 'अं',
  an: 'अं',
  ah: 'अः',
};

const MATRA_MAP: Record<string, string> = {
  a: '',
  aa: 'ा',
  A: 'ा',
  i: 'ि',
  ee: 'ी',
  I: 'ी',
  u: 'ु',
  oo: 'ू',
  U: 'ू',
  ri: 'ृ',
  e: 'े',
  ai: 'ै',
  o: 'ो',
  au: 'ौ',
  am: 'ं',
  an: 'ं',
  ah: 'ः',
};

const CONSONANT_MAP: Record<string, string> = {
  k: 'क',
  kh: 'ख',
  g: 'ग',
  gh: 'घ',
  ng: 'ङ',
  ch: 'च',
  chh: 'छ',
  j: 'ज',
  jh: 'झ',
  yna: 'ञ',
  T: 'ट',
  Th: 'ठ',
  D: 'ड',
  Dh: 'ढ',
  N: 'ण',
  t: 'त',
  th: 'थ',
  d: 'द',
  dh: 'ध',
  n: 'न',
  p: 'प',
  ph: 'फ',
  f: 'फ',
  b: 'ब',
  bh: 'भ',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  w: 'व',
  v: 'व',
  sh: 'श',
  shh: 'ष',
  s: 'स',
  h: 'ह',
  ksh: 'क्ष',
  tra: 'त्र',
  gya: 'ज्ञ',
};

const DIGIT_MAP: Record<string, string> = {
  '0': '०',
  '1': '१',
  '2': '२',
  '3': '३',
  '4': '४',
  '5': '५',
  '6': '६',
  '7': '७',
  '8': '८',
  '9': '९',
};

// Common direct word replacements for accurate genealogical names
const SPECIAL_WORDS: Record<string, string> = {
  ram: 'राम',
  shrestha: 'श्रेष्ठ',
  thapa: 'थापा',
  sharma: 'शर्मा',
  nepal: 'नेपाल',
  kathmandu: 'काठमाडौँ',
  lalitpur: 'ललितपुर',
  bhaktapur: 'भक्तपुर',
  pokhara: 'पोखरा',
  gorkha: 'गोरखा',
  palpa: 'पाल्पा',
  janakpur: 'जनकपुर',
  baba: 'बाबा',
  aama: 'आमा',
  hajurbuwa: 'हजुरबुबा',
  hajuraama: 'हजुरआमा',
  chhora: 'छोरा',
  chhori: 'छोरी',
  shriman: 'श्रीमान्',
  shrimati: 'श्रीमती',
  daju: 'दाजु',
  bhai: 'भाइ',
  didi: 'दिदी',
  bahini: 'बहिनी',
  swargiya: 'स्वर्गीय',
  jeevit: 'जीवित',
  gotra: 'गोत्र',
  pusta: 'पुस्ता',
};

/**
 * Transliterates Romanized English word into Devanagari text
 */
export function transliterateWord(word: string): string {
  if (!word) return '';

  const lowerWord = word.toLowerCase();
  if (SPECIAL_WORDS[lowerWord]) {
    return SPECIAL_WORDS[lowerWord];
  }

  let result = '';
  let i = 0;
  const len = word.length;

  while (i < len) {
    const char = word[i];

    // Numbers
    if (DIGIT_MAP[char]) {
      result += DIGIT_MAP[char];
      i++;
      continue;
    }

    // Punctuation & spaces
    if (!/[a-zA-Z]/.test(char)) {
      result += char;
      i++;
      continue;
    }

    // Check 3-char consonants (e.g. ksh, chh, yna, tra, gya)
    const three = word.slice(i, i + 3).toLowerCase();
    const two = word.slice(i, i + 2).toLowerCase();
    const one = word.slice(i, i + 1);
    const oneLower = one.toLowerCase();

    let consonant = '';
    let consLen = 0;

    if (CONSONANT_MAP[three]) {
      consonant = CONSONANT_MAP[three];
      consLen = 3;
    } else if (CONSONANT_MAP[two]) {
      consonant = CONSONANT_MAP[two];
      consLen = 2;
    } else if (CONSONANT_MAP[one] || CONSONANT_MAP[oneLower]) {
      consonant = CONSONANT_MAP[one] || CONSONANT_MAP[oneLower];
      consLen = 1;
    }

    if (consonant) {
      i += consLen;

      // Look ahead for vowel / matra
      const nextTwo = word.slice(i, i + 2).toLowerCase();
      const nextOne = word.slice(i, i + 1).toLowerCase();

      if (MATRA_MAP[nextTwo] !== undefined) {
        result += consonant + MATRA_MAP[nextTwo];
        i += 2;
      } else if (MATRA_MAP[nextOne] !== undefined) {
        result += consonant + MATRA_MAP[nextOne];
        i += 1;
      } else if (i < len && /[a-zA-Z]/.test(word[i])) {
        // Half consonant (halant)
        result += consonant + '्';
      } else {
        // Ending consonant without explicit vowel defaults to inherent 'a'
        result += consonant;
      }
      continue;
    }

    // Standalone vowel at word beginning or after vowel
    const vowelTwo = word.slice(i, i + 2).toLowerCase();
    const vowelOne = word.slice(i, i + 1).toLowerCase();

    if (VOWEL_MAP[vowelTwo]) {
      result += VOWEL_MAP[vowelTwo];
      i += 2;
    } else if (VOWEL_MAP[vowelOne]) {
      result += VOWEL_MAP[vowelOne];
      i += 1;
    } else {
      result += char;
      i++;
    }
  }

  return result;
}

/**
 * Transliterates full sentence or paragraph from Romanized English to Nepali Devanagari
 */
export function transliterateRomanToNepali(text: string): string {
  if (!text) return '';
  return text
    .split(/(\s+|[.,!?:;/\-—()]+)/)
    .map((token) => (/[a-zA-Z]/.test(token) ? transliterateWord(token) : token))
    .join('');
}
