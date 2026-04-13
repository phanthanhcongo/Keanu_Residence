/**
 * Convert country name to ISO 3166-1 alpha-2 country code
 * Supports common country names and variations
 */
export function getCountryCode(countryName: string): string | null {
  if (!countryName) {
    return null;
  }

  // Normalize country name: trim, lowercase, remove extra spaces
  const normalized = countryName.trim().toLowerCase().replace(/\s+/g, ' ');

  // Country name to code mapping (common variations)
  const countryMap: Record<string, string> = {
    // Common variations
    'vietnam': 'VN',
    'việt nam': 'VN',
    'viet nam': 'VN',
    'united states': 'US',
    'usa': 'US',
    'u.s.a.': 'US',
    'u.s.': 'US',
    'united states of america': 'US',
    'united kingdom': 'GB',
    'uk': 'GB',
    'u.k.': 'GB',
    'great britain': 'GB',
    'england': 'GB',
    'scotland': 'GB',
    'wales': 'GB',
    'canada': 'CA',
    'australia': 'AU',
    'new zealand': 'NZ',
    'singapore': 'SG',
    'malaysia': 'MY',
    'thailand': 'TH',
    'indonesia': 'ID',
    'philippines': 'PH',
    'japan': 'JP',
    'south korea': 'KR',
    'korea': 'KR',
    'china': 'CN',
    'hong kong': 'HK',
    'taiwan': 'TW',
    'india': 'IN',
    'france': 'FR',
    'germany': 'DE',
    'italy': 'IT',
    'spain': 'ES',
    'netherlands': 'NL',
    'belgium': 'BE',
    'switzerland': 'CH',
    'austria': 'AT',
    'sweden': 'SE',
    'norway': 'NO',
    'denmark': 'DK',
    'finland': 'FI',
    'poland': 'PL',
    'portugal': 'PT',
    'greece': 'GR',
    'ireland': 'IE',
    'russia': 'RU',
    'brazil': 'BR',
    'mexico': 'MX',
    'argentina': 'AR',
    'chile': 'CL',
    'colombia': 'CO',
    'peru': 'PE',
    'south africa': 'ZA',
    'egypt': 'EG',
    'uae': 'AE',
    'united arab emirates': 'AE',
    'saudi arabia': 'SA',
    'israel': 'IL',
    'turkey': 'TR',
    'bangladesh': 'BD',
    'pakistan': 'PK',
    'sri lanka': 'LK',
    'nepal': 'NP',
    'cambodia': 'KH',
    'laos': 'LA',
    'myanmar': 'MM',
    'burma': 'MM',
    'brunei': 'BN',
  };

  // Direct lookup
  if (countryMap[normalized]) {
    return countryMap[normalized];
  }

  // If already a 2-letter code (uppercase), return as is
  if (/^[A-Z]{2}$/.test(countryName.trim())) {
    return countryName.trim().toUpperCase();
  }

  // If already a 2-letter code (lowercase), convert to uppercase
  if (/^[a-z]{2}$/.test(countryName.trim())) {
    return countryName.trim().toUpperCase();
  }

  // Try partial match for common patterns
  for (const [key, code] of Object.entries(countryMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return code;
    }
  }

  // If not found, return null (will be omitted from GHL contact data)
  return null;
}

