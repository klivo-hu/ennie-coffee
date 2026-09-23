import 'server-only';
import { parseOpeningHours, type OpeningPeriod } from '@/lib/business/opening-hours';

/**
 * Business facts, read from the environment with defaults taken from the café's own published
 * sources (enniecoffee5.webnode.hu, the Instagram profile, and the Foodora listing — see
 * docs/content-sources.md). Every value can be corrected in `.env` without a code change, and the
 * UI reads them only through this module.
 */

export interface BusinessInfo {
  readonly name: string;
  readonly legalTagline: string;
  readonly streetAddress: string;
  readonly postalCode: string;
  readonly city: string;
  readonly countryCode: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly foundedYear: number | null;
  readonly openingHours: readonly OpeningPeriod[];
  readonly openingHoursText: string;
  readonly geo: { readonly latitude: number; readonly longitude: number } | null;
  readonly directionsUrl: string;
  readonly mapEmbedUrl: string;
}

const DEFAULTS = {
  name: 'Ennie Coffee',
  legalTagline: 'Ennie Coffee Kávéház',
  streetAddress: 'Kossuth tér 10.',
  postalCode: '3000',
  city: 'Hatvan',
  countryCode: 'HU',
  phone: '+36 37 950 875',
  email: 'enniecoffee@yahoo.com',
  foundedYear: '2015',
  openingHours: 'Mo-Fr 09:30-19:00; Sa-Su 10:00-19:00',
  // The Foodora listing's structured data (the only published coordinate for the café).
  geoLatitude: '47.66630301',
  geoLongitude: '19.6839051',
  // Supplied by the owner with the project brief.
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2686.9348727369434!2d19.681458277423538!3d47.66626158385415!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47404dda9f1d1de7%3A0x80f25704573e7f31!2sEnnie%20Coffee!5e0!3m2!1shu!2shu!4v1790181402452!5m2!1shu!2shu',
} as const;

function read(key: string, fallback: string): string;
function read(key: string, fallback: null): string | null;
function read(key: string, fallback: string | null): string | null {
  const value = process.env[key]?.trim();
  if (value === undefined || value === '') return fallback;
  // An explicit "-" clears a default (e.g. to hide a phone number that is no longer in use).
  return value === '-' ? null : value;
}

function readNumber(key: string, fallback: string): number | null {
  const raw = read(key, fallback);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeHttpsUrl(value: string, fallback: string): string {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

let cached: BusinessInfo | null = null;

export function business(): BusinessInfo {
  if (cached) return cached;

  const name = read('BUSINESS_NAME', DEFAULTS.name);
  const streetAddress = read('BUSINESS_STREET_ADDRESS', DEFAULTS.streetAddress);
  const postalCode = read('BUSINESS_POSTAL_CODE', DEFAULTS.postalCode);
  const city = read('BUSINESS_CITY', DEFAULTS.city);
  const openingHoursText = read('BUSINESS_OPENING_HOURS', DEFAULTS.openingHours);
  const latitude = readNumber('BUSINESS_GEO_LATITUDE', DEFAULTS.geoLatitude);
  const longitude = readNumber('BUSINESS_GEO_LONGITUDE', DEFAULTS.geoLongitude);

  const destination = encodeURIComponent(`${name}, ${streetAddress}, ${postalCode} ${city}`);
  const directionsFallback = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  cached = {
    name,
    legalTagline: read('BUSINESS_TAGLINE_NAME', DEFAULTS.legalTagline),
    streetAddress,
    postalCode,
    city,
    countryCode: read('BUSINESS_COUNTRY_CODE', DEFAULTS.countryCode),
    phone: read('BUSINESS_PHONE', DEFAULTS.phone),
    email: read('BUSINESS_EMAIL', DEFAULTS.email),
    foundedYear: readNumber('BUSINESS_FOUNDED_YEAR', DEFAULTS.foundedYear),
    openingHours: parseOpeningHours(openingHoursText),
    openingHoursText,
    geo: latitude !== null && longitude !== null ? { latitude, longitude } : null,
    directionsUrl: safeHttpsUrl(
      read('BUSINESS_DIRECTIONS_URL', directionsFallback),
      directionsFallback,
    ),
    mapEmbedUrl: safeHttpsUrl(
      read('BUSINESS_MAP_EMBED_URL', DEFAULTS.mapEmbedUrl),
      DEFAULTS.mapEmbedUrl,
    ),
  };
  return cached;
}

/** "3000 Hatvan, Kossuth tér 10." — Hungarian postal order. */
export function formattedAddress(info: BusinessInfo = business()): string {
  return `${info.postalCode} ${info.city}, ${info.streetAddress}`;
}

/** `tel:` target with spaces stripped. */
export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
