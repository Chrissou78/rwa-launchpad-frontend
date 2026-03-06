// src/lib/documentValidation.ts
// Complete document validation with MRZ support
// ============================================

import Tesseract from 'tesseract.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type DocumentType = 'national_id' | 'passport';

export interface DocumentTypeConfig {
  id: DocumentType;
  label: string;
  description: string;
  requiresBack: boolean;
  hasMRZ: boolean;
}

export const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeConfig> = {
  national_id: {
    id: 'national_id',
    label: 'National ID Card',
    description: 'Government-issued national identity card',
    requiresBack: true,
    hasMRZ: true,
  },
  passport: {
    id: 'passport',
    label: 'Passport',
    description: 'International travel passport',
    requiresBack: false,
    hasMRZ: true,
  },
};

export interface ExpectedPersonalData {
  fullName: string;
  dateOfBirth: string; // ISO format YYYY-MM-DD
  country: string; // Country name or ISO code
  documentNumber?: string;
}

export interface ValidationMatches {
  name: { score: number; maxScore: number; found: boolean };
  dateOfBirth: { score: number; maxScore: number; found: boolean };
  country: { score: number; maxScore: number; found: boolean };
  documentNumber: { score: number; maxScore: number; found: boolean };
  expiry: { score: number; maxScore: number; found: boolean; isValid?: boolean };
}

export interface FoundText {
  name?: string;
  dateOfBirth?: string;
  country?: string;
  documentNumber?: string;
  expiry?: string;
}

export interface DocumentValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  matches: ValidationMatches;
  foundText: FoundText;
  errors: string[];
  warnings: string[];
  rawOcrText?: string;
  processingTimeMs: number;
  requiresManualReview: boolean;
  mrzDetected?: boolean;
  mrzData?: MRZData;
}

export interface ExtractedDocumentData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  documentNumber?: string;
  nationality?: string;
  sex?: string;
  placeOfBirth?: string;
  issuingCountry?: string;
  personalNumber?: string;
}

export interface DocumentCaptureGuide {
  title: string;
  instructions: string[];
  tips: string[];
  examplePlacement: string;
}

export interface MRZData {
  documentType?: string;
  issuingCountry?: string;
  surname?: string;
  givenNames?: string;
  documentNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  sex?: string;
  expiryDate?: string;
  personalNumber?: string;
  rawLines?: string[];
}

// ============================================
// CONSTANTS
// ============================================

const MAX_SCORE = 100; // Name: 30, DOB: 25, Country: 15, DocNum: 15, Expiry: 15

// Country variations for matching
const COUNTRY_VARIATIONS: Record<string, string[]> = {
  'united states': ['usa', 'us', 'united states of america', 'u.s.a', 'u.s', 'estados unidos'],
  'united kingdom': ['uk', 'gb', 'gbr', 'great britain', 'britain', 'england', 'scotland', 'wales', 'northern ireland', 'reino unido'],
  'brazil': ['bra', 'br', 'brasil', 'república federativa do brasil', 'republica federativa do brasil'],
  'germany': ['deu', 'de', 'deutschland', 'bundesrepublik deutschland', 'alemania', 'allemagne'],
  'france': ['fra', 'fr', 'république française', 'republique francaise', 'francia'],
  'spain': ['esp', 'es', 'españa', 'espana', 'reino de españa', 'reino de espana'],
  'italy': ['ita', 'it', 'italia', 'repubblica italiana'],
  'portugal': ['prt', 'pt', 'república portuguesa', 'republica portuguesa'],
  'canada': ['can', 'ca'],
  'australia': ['aus', 'au'],
  'japan': ['jpn', 'jp', 'nihon', 'nippon', '日本'],
  'china': ['chn', 'cn', 'people\'s republic of china', 'prc', '中国', 'zhongguo'],
  'india': ['ind', 'in', 'bharat', 'भारत'],
  'mexico': ['mex', 'mx', 'méxico', 'estados unidos mexicanos'],
  'argentina': ['arg', 'ar', 'república argentina', 'republica argentina'],
  'south africa': ['zaf', 'za', 'rsa', 'republic of south africa'],
  'south korea': ['kor', 'kr', 'republic of korea', 'korea', '대한민국', '한국'],
  'netherlands': ['nld', 'nl', 'holland', 'nederland', 'the netherlands'],
  'belgium': ['bel', 'be', 'belgique', 'belgië', 'belgien'],
  'switzerland': ['che', 'ch', 'suisse', 'schweiz', 'svizzera', 'svizra'],
  'austria': ['aut', 'at', 'österreich', 'osterreich'],
  'sweden': ['swe', 'se', 'sverige'],
  'norway': ['nor', 'no', 'norge'],
  'denmark': ['dnk', 'dk', 'danmark'],
  'finland': ['fin', 'fi', 'suomi'],
  'ireland': ['irl', 'ie', 'éire', 'eire'],
  'new zealand': ['nzl', 'nz', 'aotearoa'],
  'singapore': ['sgp', 'sg'],
  'poland': ['pol', 'pl', 'polska', 'rzeczpospolita polska'],
  'czech republic': ['cze', 'cz', 'czechia', 'česká republika', 'ceska republika'],
  'hungary': ['hun', 'hu', 'magyarország', 'magyarorszag'],
  'romania': ['rou', 'ro', 'românia', 'romania'],
  'greece': ['grc', 'gr', 'hellas', 'ελλάδα', 'ellada'],
  'turkey': ['tur', 'tr', 'türkiye', 'turkiye'],
  'russia': ['rus', 'ru', 'russian federation', 'россия', 'rossiya'],
  'ukraine': ['ukr', 'ua', 'україна', 'ukraina'],
  'israel': ['isr', 'il', 'ישראל', 'yisrael'],
  'united arab emirates': ['are', 'ae', 'uae', 'emirates', 'الإمارات'],
  'saudi arabia': ['sau', 'sa', 'ksa', 'kingdom of saudi arabia', 'المملكة العربية السعودية'],
  'egypt': ['egy', 'eg', 'مصر', 'misr'],
  'nigeria': ['nga', 'ng', 'federal republic of nigeria'],
  'kenya': ['ken', 'ke', 'republic of kenya'],
  'thailand': ['tha', 'th', 'ประเทศไทย', 'prathet thai'],
  'vietnam': ['vnm', 'vn', 'việt nam', 'viet nam'],
  'indonesia': ['idn', 'id', 'republik indonesia'],
  'malaysia': ['mys', 'my'],
  'philippines': ['phl', 'ph', 'pilipinas', 'republika ng pilipinas'],
  'pakistan': ['pak', 'pk', 'اسلامی جمہوریہ پاکستان', 'islamic republic of pakistan'],
  'bangladesh': ['bgd', 'bd', 'বাংলাদেশ', 'people\'s republic of bangladesh'],
  'colombia': ['col', 'co', 'república de colombia', 'republica de colombia'],
  'chile': ['chl', 'cl', 'república de chile', 'republica de chile'],
  'peru': ['per', 'pe', 'república del perú', 'republica del peru'],
  'venezuela': ['ven', 've', 'república bolivariana de venezuela'],
};

// ISO 3166-1 alpha-3 to country name mapping
const ALPHA3_TO_COUNTRY: Record<string, string> = {
  'USA': 'United States',
  'GBR': 'United Kingdom',
  'BRA': 'Brazil',
  'DEU': 'Germany',
  'FRA': 'France',
  'ESP': 'Spain',
  'ITA': 'Italy',
  'PRT': 'Portugal',
  'CAN': 'Canada',
  'AUS': 'Australia',
  'JPN': 'Japan',
  'CHN': 'China',
  'IND': 'India',
  'MEX': 'Mexico',
  'ARG': 'Argentina',
  'ZAF': 'South Africa',
  'KOR': 'South Korea',
  'NLD': 'Netherlands',
  'BEL': 'Belgium',
  'CHE': 'Switzerland',
  'AUT': 'Austria',
  'SWE': 'Sweden',
  'NOR': 'Norway',
  'DNK': 'Denmark',
  'FIN': 'Finland',
  'IRL': 'Ireland',
  'NZL': 'New Zealand',
  'SGP': 'Singapore',
  'POL': 'Poland',
  'CZE': 'Czech Republic',
  'HUN': 'Hungary',
  'ROU': 'Romania',
  'GRC': 'Greece',
  'TUR': 'Turkey',
  'RUS': 'Russia',
  'UKR': 'Ukraine',
  'ISR': 'Israel',
  'ARE': 'United Arab Emirates',
  'SAU': 'Saudi Arabia',
  'EGY': 'Egypt',
  'NGA': 'Nigeria',
  'KEN': 'Kenya',
  'THA': 'Thailand',
  'VNM': 'Vietnam',
  'IDN': 'Indonesia',
  'MYS': 'Malaysia',
  'PHL': 'Philippines',
  'PAK': 'Pakistan',
  'BGD': 'Bangladesh',
  'COL': 'Colombia',
  'CHL': 'Chile',
  'PER': 'Peru',
  'VEN': 'Venezuela',
};

// Common OCR character substitutions
const OCR_SUBSTITUTIONS: Record<string, string> = {
  '0': 'O',
  'O': '0',
  '1': 'I',
  'I': '1',
  'l': '1',
  '5': 'S',
  'S': '5',
  '8': 'B',
  'B': '8',
  '2': 'Z',
  'Z': '2',
  '6': 'G',
  'G': '6',
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert a File object to a data URL
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a data URL to a File object
 */
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

/**
 * Rotate an image by the specified degrees
 */
export async function rotateImage(dataUrl: string, degrees: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Swap dimensions for 90/270 degree rotations
      if (degrees === 90 || degrees === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Get capture guide for a specific document type
 */
export function getDocumentCaptureGuide(documentType: DocumentType): DocumentCaptureGuide {
  const guides: Record<DocumentType, DocumentCaptureGuide> = {
    national_id: {
      title: 'National ID Card',
      instructions: [
        'Place your ID card on a flat, well-lit surface',
        'Ensure all four corners are visible',
        'Avoid glare and shadows',
        'Capture both front and back',
      ],
      tips: [
        'Use natural daylight when possible',
        'Hold camera parallel to the document',
        'Ensure text is sharp and readable',
      ],
      examplePlacement: 'horizontal',
    },
    passport: {
      title: 'Passport',
      instructions: [
        'Open to the photo page',
        'Place on a flat, contrasting surface',
        'Ensure MRZ (bottom code) is visible',
        'Capture the full page including all edges',
      ],
      tips: [
        'The MRZ at the bottom is essential for verification',
        'Avoid covering any part of the page',
        'Ensure the photo is clearly visible',
      ],
      examplePlacement: 'vertical',
    },
  };

  return guides[documentType];
}

/**
 * Capture a frame from a video element
 */
export function captureFromVideo(
  video: HTMLVideoElement,
  options?: { width?: number; height?: number; format?: string; quality?: number }
): string {
  const canvas = document.createElement('canvas');
  const width = options?.width || video.videoWidth;
  const height = options?.height || video.videoHeight;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(video, 0, 0, width, height);

  return canvas.toDataURL(options?.format || 'image/jpeg', options?.quality || 0.92);
}

// ============================================
// TEXT NORMALIZATION FUNCTIONS
// ============================================

/**
 * Normalize text for comparison (lowercase, remove extra whitespace, etc.)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')    // Replace non-alphanumeric with space
    .replace(/\s+/g, ' ')             // Collapse multiple spaces
    .trim();
}

/**
 * Normalize a name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z\s]/g, '')        // Keep only letters and spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate variations of text with common OCR substitutions
 */
function generateOCRVariations(text: string): string[] {
  const variations = [text];
  const upperText = text.toUpperCase();

  // Generate a few common variations
  let variation1 = upperText;
  let variation2 = upperText;

  for (const [char, sub] of Object.entries(OCR_SUBSTITUTIONS)) {
    if (upperText.includes(char)) {
      variation1 = variation1.replace(new RegExp(char, 'g'), sub);
    }
    if (upperText.includes(sub)) {
      variation2 = variation2.replace(new RegExp(sub, 'g'), char);
    }
  }

  if (variation1 !== upperText) variations.push(variation1);
  if (variation2 !== upperText) variations.push(variation2);

  return variations;
}

// ============================================
// DATE FUNCTIONS
// ============================================

/**
 * Parse a date string in various formats to ISO format
 */
function parseDate(dateStr: string): string | null {
  const cleanDate = dateStr.replace(/[^\d\/\-\.]/g, '');

  // Try different patterns
  const patterns = [
    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
    // YYYY/MM/DD or YYYY-MM-DD
    /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
    // MM/DD/YYYY (US format)
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
    // DDMMYYYY
    /^(\d{2})(\d{2})(\d{4})$/,
    // YYYYMMDD
    /^(\d{4})(\d{2})(\d{2})$/,
    // DD/MM/YY or DD-MM-YY
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/,
  ];

  for (const pattern of patterns) {
    const match = cleanDate.match(pattern);
    if (match) {
      let day: number, month: number, year: number;

      if (pattern.source.startsWith('^(\\d{4})')) {
        // YYYY-MM-DD format
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else if (match[3].length === 4) {
        // DD/MM/YYYY format (assume day/month/year for non-US)
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
      } else if (match[3].length === 2) {
        // DD/MM/YY format
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]) + (parseInt(match[3]) > 50 ? 1900 : 2000);
      } else {
        // DDMMYYYY format
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
      }

      // Validate the date
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return null;
}

/**
 * Generate various date format strings for searching
 */
function generateDateFormats(isoDate: string): string[] {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return [];

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const shortYear = String(year).slice(-2);

  const dayPadded = String(day).padStart(2, '0');
  const monthPadded = String(month).padStart(2, '0');

  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthFullNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthName = monthNames[month - 1];
  const monthFullName = monthFullNames[month - 1];

  return [
    // ISO format
    isoDate,
    // Common formats
    `${dayPadded}/${monthPadded}/${year}`,
    `${dayPadded}-${monthPadded}-${year}`,
    `${dayPadded}.${monthPadded}.${year}`,
    `${dayPadded}/${monthPadded}/${shortYear}`,
    `${dayPadded}-${monthPadded}-${shortYear}`,
    `${dayPadded}.${monthPadded}.${shortYear}`,
    // Without padding
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    // US format
    `${monthPadded}/${dayPadded}/${year}`,
    `${month}/${day}/${year}`,
    // With month name
    `${dayPadded} ${monthName} ${year}`,
    `${day} ${monthName} ${year}`,
    `${dayPadded} ${monthFullName} ${year}`,
    `${day} ${monthFullName} ${year}`,
    `${monthName} ${dayPadded}, ${year}`,
    `${monthFullName} ${day}, ${year}`,
    // MRZ format (YYMMDD)
    `${shortYear}${monthPadded}${dayPadded}`,
    // Compact format
    `${dayPadded}${monthPadded}${year}`,
    `${year}${monthPadded}${dayPadded}`,
  ];
}

/**
 * Parse MRZ date format (YYMMDD) to ISO
 */
function parseMRZDate(mrzDate: string, isExpiry: boolean = false): string | null {
  if (!/^\d{6}$/.test(mrzDate)) return null;

  const yy = parseInt(mrzDate.substring(0, 2));
  const mm = parseInt(mrzDate.substring(2, 4));
  const dd = parseInt(mrzDate.substring(4, 6));

  // Validate month and day
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  let year: number;
  
  if (isExpiry) {
    // Expiry dates: must be in future or recent past (within 10 years)
    // YY 00-99 → 2000-2099 for expiry (documents don't expire 100+ years out)
    const currentYear = new Date().getFullYear();
    const century2000 = 2000 + yy;
    const century1900 = 1900 + yy;
    
    // If 2000+YY is reasonable (not more than 20 years in future, not more than 10 years in past)
    if (century2000 >= currentYear - 10 && century2000 <= currentYear + 20) {
      year = century2000;
    } else if (century1900 >= currentYear - 10) {
      // Edge case: very old documents
      year = century1900;
    } else {
      // Default to 2000s for expiry
      year = century2000;
    }
  } else {
    // Birth dates: typically in the past
    // YY > 30 → 1900s (someone born in 1930-1999)
    // YY <= 30 → 2000s (someone born in 2000-2030)
    const currentYear = new Date().getFullYear();
    const currentYY = currentYear % 100;
    
    // If YY is greater than current year + 5, it's probably 1900s
    if (yy > currentYY + 5) {
      year = 1900 + yy;
    } else {
      year = 2000 + yy;
    }
  }

  return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

// ============================================
// MRZ DETECTION AND PARSING
// ============================================

/**
 * Check if text contains MRZ
 */
function hasMRZ(text: string): boolean {
  const mrzPatterns = [
    /P<[A-Z]{3}[A-Z<]+<<[A-Z<]+/,           // Passport line 1
    /[A-Z0-9<]{9}[0-9][A-Z]{3}[0-9]{6}[0-9][MF<][0-9]{6}/, // Passport line 2
    /[A-Z]{2}[A-Z0-9<]{9}[0-9][A-Z]{3}/,    // ID card MRZ
    /<<+/,                                    // MRZ separator
  ];

  const normalizedText = text.toUpperCase().replace(/\s+/g, '');
  return mrzPatterns.some(pattern => pattern.test(normalizedText));
}

/**
 * Extract MRZ data from text
 */
function extractMRZData(text: string): MRZData | null {
  console.log('[extractMRZData] Starting MRZ extraction...');
  
  const lines = text
    .toUpperCase()
    .split('\n')
    .map(line => line.replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, ''))
    .filter(line => line.length >= 28);

  console.log('[extractMRZData] Potential MRZ lines found:', lines.length);
  lines.forEach((line, i) => {
    console.log(`[extractMRZData] Line ${i + 1} (${line.length} chars):`, line);
  });

  if (lines.length < 1) {
    console.log('[extractMRZData] No valid MRZ lines found');
    return null;
  }

  // Find MRZ lines
  const mrzLines = lines.filter(line =>
    (line.length >= 28 && line.includes('<')) ||
    /^P</.test(line) ||
    /^ID/.test(line) ||
    /^[A-Z]{2}[A-Z0-9<]/.test(line)
  );

  console.log('[extractMRZData] Filtered MRZ lines:', mrzLines.length);
  mrzLines.forEach((line, i) => {
    console.log(`[extractMRZData] MRZ Line ${i + 1}:`, line);
  });

  if (mrzLines.length < 1) {
    console.log('[extractMRZData] No valid MRZ lines after filtering');
    return null;
  }

  const result: MRZData = {
    rawLines: mrzLines.slice(0, 3),
  };

  const firstLine = mrzLines[0];

  // ============================================
  // ID CARD FORMAT (3 lines, ~30 characters each)
  // ============================================
  // Line 1: IDFRACID4ZZ2448<<<<<LLLLLLLLLL
  //         ID = ID card, FRA = country, CID4ZZ2448 = doc number
  // Line 2: 7708305M3208036FRA<<<<<<<<<<<4
  //         YYMMDD + check + sex + YYMMDD + check + nationality
  // Line 3: FOURQUIER<<CHRISTOPHER<GILLES<
  //         SURNAME<<FIRSTNAME<MIDDLENAME
  // ============================================

  if (firstLine.startsWith('ID')) {
    console.log('[extractMRZData] ID Card detected');
    result.documentType = 'ID';
    result.issuingCountry = firstLine.substring(2, 5).replace(/</g, '');
    console.log('[extractMRZData] Issuing country:', result.issuingCountry);

    // Document number is after country code, before the <<
    const afterCountry = firstLine.substring(5);
    const docNumEnd = afterCountry.indexOf('<');
    if (docNumEnd > 0) {
      result.documentNumber = afterCountry.substring(0, docNumEnd);
    } else {
      result.documentNumber = afterCountry.replace(/</g, '').substring(0, 9);
    }
    console.log('[extractMRZData] Document number:', result.documentNumber);

    // Find Line 2 (starts with DOB: 6 digits)
    const line2 = mrzLines.find(line => /^\d{6,7}[MF<]\d{6,7}/.test(line));
    if (line2) {
      console.log('[extractMRZData] Parsing ID card line 2:', line2);

      // Format: YYMMDD + check + sex + YYMMDD + check + nationality
      const idDataPattern = /^(\d{6})(\d)([MF<])(\d{6})(\d)([A-Z]{3})/;
      const match = line2.match(idDataPattern);

      if (match) {
        const [, dobRaw, , sex, expiryRaw, , nationality] = match;
        console.log('[extractMRZData] Parsed:', { dobRaw, sex, expiryRaw, nationality });

        // DOB
        const dob = parseMRZDate(dobRaw, false);
        if (dob) {
          result.dateOfBirth = dob;
          console.log('[extractMRZData] DOB:', dobRaw, '->', dob);
        }

        // Sex
        result.sex = sex === '<' ? undefined : sex;
        console.log('[extractMRZData] Sex:', result.sex);

        // Expiry
        const expiry = parseMRZDate(expiryRaw, true);
        if (expiry) {
          result.expiryDate = expiry;
          console.log('[extractMRZData] Expiry:', expiryRaw, '->', expiry);
        }

        // Nationality
        if (ALPHA3_TO_COUNTRY[nationality]) {
          result.nationality = nationality;
          console.log('[extractMRZData] Nationality:', nationality);
        }
      }
    }

    // Find Line 3 (name line with <<)
    const line3 = mrzLines.find(line =>
      !line.startsWith('ID') &&
      !/^\d{6}/.test(line) &&
      line.includes('<<')
    );
    if (line3) {
      console.log('[extractMRZData] Parsing ID card name line:', line3);
      const nameParts = line3.split('<<');
      if (nameParts.length >= 2) {
        result.surname = nameParts[0].replace(/</g, ' ').trim();
        result.givenNames = nameParts[1].replace(/</g, ' ').trim();
        console.log('[extractMRZData] Name:', result.givenNames, result.surname);
      }
    }
  }

  // ============================================
  // PASSPORT FORMAT (2 lines, 44 characters each)
  // ============================================
  // Line 1: P<USATOWNLEY<<BENJAMIN<ANDREW<<<<<<<<<<<<<<<
  //         P = Passport, USA = country, SURNAME<<FIRSTNAME
  // Line 2: A356359829USA1409024M2905051717395952<242358
  //         Doc number + check + nationality + DOB + check + sex + expiry + check
  // ============================================

  else if (firstLine.startsWith('P<')) {
    console.log('[extractMRZData] Passport detected');
    result.documentType = 'P';
    result.issuingCountry = firstLine.substring(2, 5).replace(/</g, '');
    console.log('[extractMRZData] Issuing country:', result.issuingCountry);

    // Name from line 1
    const namePart = firstLine.substring(5);
    const nameParts = namePart.split('<<');
    if (nameParts.length >= 2) {
      result.surname = nameParts[0].replace(/</g, ' ').trim();
      result.givenNames = nameParts[1].replace(/</g, ' ').trim();
      console.log('[extractMRZData] Name:', result.givenNames, result.surname);
    }

    // Find Line 2 (data line)
    const line2 = mrzLines.find(line =>
      !line.startsWith('P<') &&
      /^[A-Z0-9]{9}[0-9]/.test(line)
    );

    if (line2) {
      console.log('[extractMRZData] Parsing passport line 2:', line2);

      // Document number (first 9 characters)
      result.documentNumber = line2.substring(0, 9).replace(/</g, '');
      console.log('[extractMRZData] Document number:', result.documentNumber);

      // Find nationality (3 letters after position 10)
      for (let i = 10; i < Math.min(16, line2.length - 2); i++) {
        const threeChars = line2.substring(i, i + 3);
        if (/^[A-Z]{3}$/.test(threeChars) && ALPHA3_TO_COUNTRY[threeChars]) {
          result.nationality = threeChars;
          console.log('[extractMRZData] Nationality at position', i, ':', threeChars);

          // After nationality: YYMMDD + check + sex + YYMMDD + check
          const afterNationality = line2.substring(i + 3);
          const datesSexPattern = /^(\d{6})(\d)([MF<])(\d{6})(\d)/;
          const datesMatch = afterNationality.match(datesSexPattern);

          if (datesMatch) {
            const [, dobRaw, , sex, expiryRaw] = datesMatch;
            console.log('[extractMRZData] Parsed:', { dobRaw, sex, expiryRaw });

            // DOB
            const dob = parseMRZDate(dobRaw, false);
            if (dob) {
              result.dateOfBirth = dob;
              console.log('[extractMRZData] DOB:', dobRaw, '->', dob);
            }

            // Sex
            result.sex = sex === '<' ? undefined : sex;
            console.log('[extractMRZData] Sex:', result.sex);

            // Expiry
            const expiry = parseMRZDate(expiryRaw, true);
            if (expiry) {
              result.expiryDate = expiry;
              console.log('[extractMRZData] Expiry:', expiryRaw, '->', expiry);
            }
          }
          break;
        }
      }
    }
  }

  // ============================================
  // FALLBACK: Try generic MRZ pattern matching
  // ============================================
  
  else {
    console.log('[extractMRZData] Unknown format, trying fallback extraction');

    for (const line of mrzLines) {
      // Try to find name line
      if (line.includes('<<') && !result.surname) {
        const nameParts = line.split('<<');
        if (nameParts.length >= 2) {
          result.surname = nameParts[0].replace(/</g, ' ').replace(/^[A-Z]{2,5}/, '').trim();
          result.givenNames = nameParts[1].replace(/</g, ' ').trim();
          console.log('[extractMRZData] Name (fallback):', result.givenNames, result.surname);
        }
      }

      // Try to find data line with DOB/sex/expiry pattern
      const dataPattern = /(\d{6})(\d)([MF<])(\d{6})(\d)/;
      const dataMatch = line.match(dataPattern);
      if (dataMatch && !result.dateOfBirth) {
        const [, dobRaw, , sex, expiryRaw] = dataMatch;

        const dob = parseMRZDate(dobRaw, false);
        if (dob) {
          result.dateOfBirth = dob;
          console.log('[extractMRZData] DOB (fallback):', dob);
        }

        result.sex = sex === '<' ? undefined : sex;

        const expiry = parseMRZDate(expiryRaw, true);
        if (expiry) {
          result.expiryDate = expiry;
          console.log('[extractMRZData] Expiry (fallback):', expiry);
        }
      }

      // Try to find nationality
      const natMatch = line.match(/([A-Z]{3})/g);
      if (natMatch && !result.nationality) {
        for (const code of natMatch) {
          if (ALPHA3_TO_COUNTRY[code]) {
            result.nationality = code;
            console.log('[extractMRZData] Nationality (fallback):', code);
            break;
          }
        }
      }
    }
  }

  // Check if we found anything useful
  const hasData = result.documentNumber || result.dateOfBirth || result.surname || result.expiryDate;

  if (!hasData) {
    console.log('[extractMRZData] No useful data extracted');
    return null;
  }

  console.log('[extractMRZData] Final result:', JSON.stringify(result, null, 2));
  return result;
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

/**
 * Search for name in OCR text
 */
function findNameInText(
  ocrText: string,
  expectedName: string,
  mrzData?: MRZData | null
): { score: number; foundText?: string } {
  const normalizedOcr = normalizeText(ocrText);
  const normalizedExpected = normalizeName(expectedName);

  // Split expected name into parts
  const nameParts = normalizedExpected.split(' ').filter(part => part.length > 1);
  if (nameParts.length === 0) {
    return { score: 0 };
  }

  let maxScore = 0;
  let foundText: string | undefined;

  // Check MRZ data first (most reliable)
  if (mrzData?.surname && mrzData?.givenNames) {
    const mrzFullName = `${mrzData.givenNames} ${mrzData.surname}`.toLowerCase();
    const mrzNormalized = normalizeName(mrzFullName);

    // Check if all expected name parts are in MRZ
    const mrzParts = mrzNormalized.split(' ');
    let matchedParts = 0;
    for (const part of nameParts) {
      if (mrzParts.some(mrzPart => mrzPart.includes(part) || part.includes(mrzPart))) {
        matchedParts++;
      }
    }

    if (matchedParts === nameParts.length) {
      return { score: 30, foundText: `${mrzData.givenNames} ${mrzData.surname} (MRZ)` };
    } else if (matchedParts > 0) {
      const partialScore = Math.round((matchedParts / nameParts.length) * 25);
      if (partialScore > maxScore) {
        maxScore = partialScore;
        foundText = `${mrzData.givenNames} ${mrzData.surname} (MRZ partial)`;
      }
    }
  }

  // Search in OCR text
  let matchedParts = 0;
  const foundParts: string[] = [];

  for (const part of nameParts) {
    // Direct match
    if (normalizedOcr.includes(part)) {
      matchedParts++;
      foundParts.push(part);
      continue;
    }

    // Try with OCR variations
    const variations = generateOCRVariations(part);
    for (const variation of variations) {
      if (normalizedOcr.includes(variation.toLowerCase())) {
        matchedParts++;
        foundParts.push(variation);
        break;
      }
    }
  }

  if (matchedParts > 0) {
    // Score based on how many parts matched
    const score = Math.round((matchedParts / nameParts.length) * 30);
    if (score > maxScore) {
      maxScore = score;
      foundText = foundParts.join(' ');
    }
  }

  return { score: maxScore, foundText };
}

/**
 * Search for date of birth in OCR text
 */
function findDobInText(
  ocrText: string,
  expectedDob: string,
  mrzData?: MRZData | null
): { score: number; foundText?: string } {
  // Check MRZ data first
  if (mrzData?.dateOfBirth) {
    const mrzDob = mrzData.dateOfBirth;
    if (mrzDob === expectedDob) {
      return { score: 25, foundText: `${mrzDob} (MRZ)` };
    }
    // Check if year and month match (day might differ due to OCR)
    const expectedParts = expectedDob.split('-');
    const mrzParts = mrzDob.split('-');
    if (expectedParts[0] === mrzParts[0] && expectedParts[1] === mrzParts[1]) {
      return { score: 20, foundText: `${mrzDob} (MRZ partial)` };
    }
  }

  // Generate all possible date formats
  const dateFormats = generateDateFormats(expectedDob);
  const normalizedOcr = ocrText.toLowerCase().replace(/\s+/g, '');

  for (const format of dateFormats) {
    const normalizedFormat = format.toLowerCase().replace(/\s+/g, '');
    if (normalizedOcr.includes(normalizedFormat)) {
      return { score: 25, foundText: format };
    }

    // Try with some flexibility (remove separators)
    const compactFormat = format.replace(/[\/\-\.]/g, '');
    if (normalizedOcr.includes(compactFormat)) {
      return { score: 20, foundText: format };
    }
  }

  // Try to find the date components separately
  const date = new Date(expectedDob);
  if (!isNaN(date.getTime())) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (normalizedOcr.includes(year)) {
      if (normalizedOcr.includes(month) && normalizedOcr.includes(day)) {
        return { score: 15, foundText: `${day}/${month}/${year} (components)` };
      }
      return { score: 10, foundText: `Year ${year} found` };
    }
  }

  return { score: 0 };
}

/**
 * Search for country in OCR text
 */
function findCountryInText(
  ocrText: string,
  expectedCountry: string,
  mrzData?: MRZData | null
): { score: number; foundText?: string } {
  const normalizedOcr = normalizeText(ocrText);
  const normalizedCountry = normalizeText(expectedCountry);

  // Check MRZ data first
  if (mrzData?.nationality || mrzData?.issuingCountry) {
    const mrzCountry = mrzData.nationality || mrzData.issuingCountry;
    if (mrzCountry) {
      const mrzCountryName = ALPHA3_TO_COUNTRY[mrzCountry.toUpperCase()];
      if (mrzCountryName) {
        const normalizedMrzCountry = normalizeText(mrzCountryName);
        if (normalizedMrzCountry === normalizedCountry ||
            normalizedMrzCountry.includes(normalizedCountry) ||
            normalizedCountry.includes(normalizedMrzCountry)) {
          return { score: 15, foundText: `${mrzCountryName} (${mrzCountry}) (MRZ)` };
        }
      }
      // Check against variations
      for (const [country, variations] of Object.entries(COUNTRY_VARIATIONS)) {
        if (variations.includes(mrzCountry.toLowerCase())) {
          if (normalizeText(country) === normalizedCountry) {
            return { score: 15, foundText: `${country} (${mrzCountry}) (MRZ)` };
          }
        }
      }
    }
  }

  // Direct match
  if (normalizedOcr.includes(normalizedCountry)) {
    return { score: 15, foundText: expectedCountry };
  }

  // Check variations
  for (const [country, variations] of Object.entries(COUNTRY_VARIATIONS)) {
    if (normalizeText(country) === normalizedCountry) {
      for (const variation of variations) {
        if (normalizedOcr.includes(variation.toLowerCase())) {
          return { score: 15, foundText: variation };
        }
      }
    }
  }

  // Check for 3-letter country code
  const alpha3Codes = ocrText.toUpperCase().match(/\b[A-Z]{3}\b/g);
  if (alpha3Codes) {
    for (const code of alpha3Codes) {
      const countryName = ALPHA3_TO_COUNTRY[code];
      if (countryName && normalizeText(countryName) === normalizedCountry) {
        return { score: 15, foundText: `${countryName} (${code})` };
      }
    }
  }

  return { score: 0 };
}

/**
 * Search for document number in OCR text
 */
function findDocumentNumberInText(
  ocrText: string,
  expectedNumber: string,
  mrzData?: MRZData | null
): { score: number; foundText?: string } {
  const normalizedOcr = ocrText.toUpperCase().replace(/\s+/g, '');
  const normalizedExpected = expectedNumber.toUpperCase().replace(/[\s\-\.]/g, '');

  // Check MRZ data first
  if (mrzData?.documentNumber) {
    const mrzDocNum = mrzData.documentNumber.replace(/</g, '').toUpperCase();
    if (mrzDocNum === normalizedExpected) {
      return { score: 15, foundText: `${mrzDocNum} (MRZ)` };
    }
    // Partial match (OCR errors)
    if (mrzDocNum.length > 0 && normalizedExpected.length > 0) {
      let matchCount = 0;
      const minLen = Math.min(mrzDocNum.length, normalizedExpected.length);
      for (let i = 0; i < minLen; i++) {
        if (mrzDocNum[i] === normalizedExpected[i]) matchCount++;
      }
      if (matchCount >= minLen * 0.8) {
        return { score: 12, foundText: `${mrzDocNum} (MRZ partial)` };
      }
    }
  }

  // Direct match
  if (normalizedOcr.includes(normalizedExpected)) {
    return { score: 15, foundText: expectedNumber };
  }

  // Try with OCR variations
  const variations = generateOCRVariations(normalizedExpected);
  for (const variation of variations) {
    if (normalizedOcr.includes(variation)) {
      return { score: 12, foundText: variation };
    }
  }

  // Try partial match (at least 70% of characters)
  if (normalizedExpected.length >= 4) {
    for (let i = 0; i <= normalizedOcr.length - normalizedExpected.length; i++) {
      const substring = normalizedOcr.substring(i, i + normalizedExpected.length);
      let matchCount = 0;
      for (let j = 0; j < normalizedExpected.length; j++) {
        if (substring[j] === normalizedExpected[j]) matchCount++;
      }
      if (matchCount >= normalizedExpected.length * 0.7) {
        return { score: 10, foundText: substring };
      }
    }
  }

  return { score: 0 };
}

/**
 * Search for expiry date in OCR text
 */
function findExpiryInText(
  ocrText: string,
  mrzData?: MRZData | null
): { score: number; foundText?: string; isValid?: boolean } {
  const today = new Date();

  // Check MRZ data first
  if (mrzData?.expiryDate) {
    const expiryDate = new Date(mrzData.expiryDate);
    const isValid = expiryDate > today;
    return {
      score: 15,
      foundText: `${mrzData.expiryDate} (MRZ)`,
      isValid,
    };
  }

  // Search for expiry-related keywords
  const expiryPatterns = [
    /(?:expir[yied]|valid(?:ity)?|validade|exp|venc(?:imiento)?)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})[:\s]*(?:expir[yied]|valid|validade)/gi,
    /(?:exp|val)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/gi,
  ];

  for (const pattern of expiryPatterns) {
    const matches = ocrText.matchAll(pattern);
    for (const match of matches) {
      const dateStr = match[1];
      const parsed = parseDate(dateStr);
      if (parsed) {
        const expiryDate = new Date(parsed);
        // Check if it's a reasonable expiry date (not too far in past or future)
        const yearDiff = expiryDate.getFullYear() - today.getFullYear();
        if (yearDiff >= -5 && yearDiff <= 15) {
          return {
            score: 15,
            foundText: parsed,
            isValid: expiryDate > today,
          };
        }
      }
    }
  }

  // Try to find any future date that might be expiry
  const datePattern = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g;
  const matches = ocrText.matchAll(datePattern);
  for (const match of matches) {
    const parsed = parseDate(match[1]);
    if (parsed) {
      const date = new Date(parsed);
      // If it's a future date, it might be expiry
      if (date > today && date.getFullYear() <= today.getFullYear() + 15) {
        return {
          score: 10,
          foundText: `${parsed} (possible)`,
          isValid: true,
        };
      }
    }
  }

  return { score: 0 };
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate an ID document against expected personal data
 */
export async function validateIdDocument(
  frontImage: string,
  backImage: string | null,
  expectedData: ExpectedPersonalData,
  documentType: DocumentType,
  onProgress?: (stage: string, percent: number) => void
): Promise<DocumentValidationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('========================================');
  console.log('[documentValidation.ts] STARTING VALIDATION');
  console.log('========================================');
  console.log('[documentValidation.ts] Expected Data:', JSON.stringify(expectedData, null, 2));
  console.log('[documentValidation.ts] Document Type:', documentType);

  try {
    onProgress?.('Loading OCR engine...', 5);

    // Run OCR on images
    const ocrResults: string[] = [];

    onProgress?.('Processing front image...', 15);
    console.log('[documentValidation.ts] Running OCR on front image...');
    
    const frontResult = await Tesseract.recognize(frontImage, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.('Analyzing front image...', 15 + (m.progress * 30));
        }
      },
    });
    ocrResults.push(frontResult.data.text);
    
    console.log('----------------------------------------');
    console.log('[documentValidation.ts] FRONT IMAGE OCR RESULT:');
    console.log('----------------------------------------');
    console.log(frontResult.data.text);
    console.log('----------------------------------------');

    if (backImage) {
      onProgress?.('Processing back image...', 50);
      console.log('[documentValidation.ts] Running OCR on back image...');
      
      const backResult = await Tesseract.recognize(backImage, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            onProgress?.('Analyzing back image...', 50 + (m.progress * 25));
          }
        },
      });
      ocrResults.push(backResult.data.text);
      
      console.log('----------------------------------------');
      console.log('[documentValidation.ts] BACK IMAGE OCR RESULT:');
      console.log('----------------------------------------');
      console.log(backResult.data.text);
      console.log('----------------------------------------');
    }

    const combinedText = ocrResults.join('\n');
    onProgress?.('Validating document data...', 80);

    // Check for MRZ and extract data
    console.log('[documentValidation.ts] Checking for MRZ...');
    const mrzDetected = hasMRZ(combinedText);
    console.log('[documentValidation.ts] MRZ Detected:', mrzDetected);
    
    const mrzData = mrzDetected ? extractMRZData(combinedText) : null;
    
    if (mrzData) {
      console.log('----------------------------------------');
      console.log('[documentValidation.ts] EXTRACTED MRZ DATA:');
      console.log('----------------------------------------');
      console.log(JSON.stringify(mrzData, null, 2));
      console.log('----------------------------------------');
    } else if (mrzDetected) {
      console.log('[documentValidation.ts] MRZ detected but extraction failed');
    }

    if (mrzDetected && mrzData) {
      // MRZ detected - high confidence source
    } else if (DOCUMENT_TYPES[documentType].hasMRZ) {
      warnings.push('MRZ not detected - using visual text matching');
    }

    // Search for expected data in OCR text
    console.log('[documentValidation.ts] Searching for NAME:', expectedData.fullName);
    const nameResult = findNameInText(combinedText, expectedData.fullName, mrzData);
    console.log('[documentValidation.ts] Name Result:', JSON.stringify(nameResult));

    console.log('[documentValidation.ts] Searching for DOB:', expectedData.dateOfBirth);
    const dobResult = findDobInText(combinedText, expectedData.dateOfBirth, mrzData);
    console.log('[documentValidation.ts] DOB Result:', JSON.stringify(dobResult));

    console.log('[documentValidation.ts] Searching for COUNTRY:', expectedData.country);
    const countryResult = findCountryInText(combinedText, expectedData.country, mrzData);
    console.log('[documentValidation.ts] Country Result:', JSON.stringify(countryResult));

    let docNumResult = { score: 0 };
    if (expectedData.documentNumber) {
      console.log('[documentValidation.ts] Searching for DOC NUMBER:', expectedData.documentNumber);
      docNumResult = findDocumentNumberInText(combinedText, expectedData.documentNumber, mrzData);
      console.log('[documentValidation.ts] Doc Number Result:', JSON.stringify(docNumResult));
    }

    console.log('[documentValidation.ts] Searching for EXPIRY DATE...');
    const expiryResult = findExpiryInText(combinedText, mrzData);
    console.log('[documentValidation.ts] Expiry Result:', JSON.stringify(expiryResult));

    // Calculate total score
    const totalScore = nameResult.score + dobResult.score + countryResult.score +
                       (expectedData.documentNumber ? docNumResult.score : 0) + expiryResult.score;

    // Calculate max possible score
    const maxPossibleScore = 30 + 25 + 15 + (expectedData.documentNumber ? 15 : 0) + 15;
    const confidence = Math.round((totalScore / maxPossibleScore) * 100);

    console.log('----------------------------------------');
    console.log('[documentValidation.ts] SCORE CALCULATION:');
    console.log('----------------------------------------');
    console.log('  Name Score:', nameResult.score, '/ 30');
    console.log('  DOB Score:', dobResult.score, '/ 25');
    console.log('  Country Score:', countryResult.score, '/ 15');
    console.log('  Doc Number Score:', docNumResult.score, '/ 15');
    console.log('  Expiry Score:', expiryResult.score, '/ 15');
    console.log('  -----------------');
    console.log('  Total Score:', totalScore, '/', maxPossibleScore);
    console.log('  Confidence:', confidence + '%');
    console.log('----------------------------------------');

    // Build matches object
    const matches: ValidationMatches = {
      name: {
        score: nameResult.score,
        maxScore: 30,
        found: nameResult.score >= 10,
      },
      dateOfBirth: {
        score: dobResult.score,
        maxScore: 25,
        found: dobResult.score >= 10,
      },
      country: {
        score: countryResult.score,
        maxScore: 15,
        found: countryResult.score >= 5,
      },
      documentNumber: {
        score: docNumResult.score,
        maxScore: 15,
        found: docNumResult.score >= 5,
      },
      expiry: {
        score: expiryResult.score,
        maxScore: 15,
        found: expiryResult.score >= 5,
        isValid: expiryResult.isValid,
      },
    };

    // Build found text object
    const foundText: FoundText = {
      name: nameResult.foundText,
      dateOfBirth: dobResult.foundText,
      country: countryResult.foundText,
      documentNumber: docNumResult.foundText,
      expiry: expiryResult.foundText,
    };

    console.log('[documentValidation.ts] Found Text:', JSON.stringify(foundText, null, 2));

    // Add errors for missing critical fields
    if (nameResult.score < 10) {
      errors.push('Name not found or does not match');
    }
    if (dobResult.score < 10 && countryResult.score < 5) {
      errors.push('Neither date of birth nor country could be verified');
    }

    // Add warnings
    if (dobResult.score > 0 && dobResult.score < 20) {
      warnings.push('Date of birth partially matched - please verify');
    }
    if (expiryResult.isValid === false) {
      errors.push('Document appears to be expired');
    }
    if (!expiryResult.foundText) {
      warnings.push('Expiry date not found - manual verification recommended');
    }

    // Determine validity
    const isValid = nameResult.score >= 10 && (dobResult.score >= 10 || countryResult.score >= 5);
    const requiresManualReview = !isValid || confidence < 50 || errors.length > 0;

    console.log('[documentValidation.ts] Is Valid:', isValid);
    console.log('[documentValidation.ts] Requires Manual Review:', requiresManualReview);
    console.log('[documentValidation.ts] Errors:', errors);
    console.log('[documentValidation.ts] Warnings:', warnings);
    console.log('[documentValidation.ts] Processing Time:', Date.now() - startTime, 'ms');
    console.log('========================================');

    onProgress?.('Validation complete', 100);

    return {
      isValid,
      confidence,
      matches,
      foundText,
      errors,
      warnings,
      rawOcrText: combinedText,
      processingTimeMs: Date.now() - startTime,
      requiresManualReview,
      mrzDetected,
      mrzData: mrzData || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[documentValidation.ts] ERROR:', errorMessage);
    console.error(error);
    onProgress?.('Error occurred', 100);

    return {
      isValid: false,
      confidence: 0,
      matches: {
        name: { score: 0, maxScore: 30, found: false },
        dateOfBirth: { score: 0, maxScore: 25, found: false },
        country: { score: 0, maxScore: 15, found: false },
        documentNumber: { score: 0, maxScore: 15, found: false },
        expiry: { score: 0, maxScore: 15, found: false },
      },
      foundText: {},
      errors: [`OCR processing failed: ${errorMessage}`],
      warnings: [],
      processingTimeMs: Date.now() - startTime,
      requiresManualReview: true,
    };
  }
}

// ============================================
// ADDITIONAL EXPORTS FOR COMPATIBILITY
// ============================================

// Re-export types that might be used elsewhere
export type {
  DocumentTypeConfig,
  MRZData,
};
