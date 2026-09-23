import 'server-only';
import { business, formattedAddress } from '@/lib/config/business';

/**
 * Legal operator information for the Impresszum and the privacy and cookie notices.
 *
 * None of these facts were published by the café, so none have defaults: a missing value is
 * rendered as an explicit gap ("nincs megadva") and listed in the admin dashboard, never filled
 * with an invented company name or tax number. Set them in `.env` — see `.env.example`.
 */

export interface LegalField {
  readonly key: string;
  readonly label: string;
  readonly value: string | null;
}

export interface LegalInfo {
  readonly operatorName: LegalField;
  readonly registeredAddress: LegalField;
  readonly registrationNumber: LegalField;
  readonly registryAuthority: LegalField;
  readonly taxNumber: LegalField;
  readonly representative: LegalField;
  readonly contactEmail: LegalField;
  readonly contactPhone: LegalField;
  readonly hostingName: LegalField;
  readonly hostingAddress: LegalField;
  readonly hostingContact: LegalField;
  readonly effectiveDate: LegalField;
}

function field(key: string, label: string, fallback: string | null = null): LegalField {
  const raw = process.env[key]?.trim();
  return { key, label, value: raw ? raw : fallback };
}

export function legal(): LegalInfo {
  const info = business();
  return {
    operatorName: field('LEGAL_OPERATOR_NAME', 'Üzemeltető (cég- vagy vállalkozói név)'),
    registeredAddress: field('LEGAL_REGISTERED_ADDRESS', 'Székhely'),
    registrationNumber: field('LEGAL_REGISTRATION_NUMBER', 'Cégjegyzékszám / nyilvántartási szám'),
    registryAuthority: field('LEGAL_REGISTRY_AUTHORITY', 'Nyilvántartó hatóság'),
    taxNumber: field('LEGAL_TAX_NUMBER', 'Adószám'),
    representative: field('LEGAL_REPRESENTATIVE', 'Képviselő'),
    contactEmail: field('LEGAL_CONTACT_EMAIL', 'E-mail', info.email),
    contactPhone: field('LEGAL_CONTACT_PHONE', 'Telefon', info.phone),
    hostingName: field('LEGAL_HOSTING_PROVIDER_NAME', 'Tárhelyszolgáltató'),
    hostingAddress: field('LEGAL_HOSTING_PROVIDER_ADDRESS', 'Tárhelyszolgáltató címe'),
    hostingContact: field('LEGAL_HOSTING_PROVIDER_CONTACT', 'Tárhelyszolgáltató elérhetősége'),
    effectiveDate: field('LEGAL_EFFECTIVE_DATE', 'Hatályos'),
  };
}

/** Fields that must be set before launch. Surfaced in the admin dashboard. */
export function missingLegalFields(): LegalField[] {
  const info = legal();
  return Object.values(info).filter((entry) => entry.value === null);
}

export { formattedAddress };
