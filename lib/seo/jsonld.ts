import { schemaOpeningHours } from '@/lib/business/opening-hours';
import type { BusinessInfo } from '@/lib/config/business';
import { formatForint } from '@/lib/menu/format';
import type { MenuCategory, SocialLink } from '@/lib/menu/types';
import { absoluteUrl } from '@/lib/site-url';

/**
 * Structured data. Only facts the café has published are emitted — no rating, price range, or
 * cuisine claims the sources do not support. Values come from the environment and the database,
 * so they are serialized through `jsonLdScript`, which escapes `<` to keep a stray "</script>"
 * inside a value from ever closing the element.
 */

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function cafeJsonLd(info: BusinessInfo, social: readonly SocialLink[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    '@id': absoluteUrl('/#kavezo'),
    name: info.name,
    alternateName: info.legalTagline,
    url: absoluteUrl('/'),
    image: absoluteUrl('/opengraph-image'),
    ...(info.phone ? { telephone: info.phone.replace(/\s/g, '') } : {}),
    ...(info.email ? { email: info.email } : {}),
    ...(info.foundedYear ? { foundingDate: String(info.foundedYear) } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: info.streetAddress,
      postalCode: info.postalCode,
      addressLocality: info.city,
      addressCountry: info.countryCode,
    },
    ...(info.geo
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: info.geo.latitude,
            longitude: info.geo.longitude,
          },
        }
      : {}),
    ...(info.openingHours.length > 0
      ? { openingHoursSpecification: schemaOpeningHours(info.openingHours) }
      : {}),
    hasMenu: absoluteUrl('/arlista'),
    acceptsReservations: info.phone ? 'True' : 'False',
    ...(social.length > 0 ? { sameAs: social.map((link) => link.url) } : {}),
  };
}

export function menuJsonLd(info: BusinessInfo, menu: readonly MenuCategory[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: `${info.name} árlista`,
    url: absoluteUrl('/arlista'),
    inLanguage: 'hu',
    hasMenuSection: menu.map((category) => ({
      '@type': 'MenuSection',
      name: category.name,
      ...(category.description ? { description: category.description } : {}),
      hasMenuItem: category.products.map((product) => ({
        '@type': 'MenuItem',
        name: product.name,
        ...(product.description ? { description: product.description } : {}),
        offers: product.prices.map((price) => ({
          '@type': 'Offer',
          price: price.amountHuf,
          priceCurrency: 'HUF',
          ...(price.label ? { name: price.label } : {}),
          ...(product.qualifier === 'from'
            ? {
                description: `${formatForint(price.amountHuf)}-tól, a választott kiszereléstől függően`,
              }
            : {}),
        })),
      })),
    })),
  };
}

export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
