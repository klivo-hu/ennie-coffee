import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Facebook,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Menu,
  Music2,
  Phone,
  ShoppingBag,
  Star,
  X,
  Youtube,
  type LucideProps,
} from 'lucide-react';
import type { SocialPlatformId } from '@/lib/social/platforms';

/**
 * The icon set, drawn at one stroke weight so every glyph on the site belongs together. Icons are
 * decorative by default (aria-hidden); the control around them carries the accessible name.
 */
const base: LucideProps = { strokeWidth: 1.5, 'aria-hidden': true, focusable: false };

export const ArrowIcon = (props: LucideProps) => <ArrowRight {...base} {...props} />;
export const ExternalIcon = (props: LucideProps) => <ArrowUpRight {...base} {...props} />;
export const PhoneIcon = (props: LucideProps) => <Phone {...base} {...props} />;
export const MailIcon = (props: LucideProps) => <Mail {...base} {...props} />;
export const PinIcon = (props: LucideProps) => <MapPin {...base} {...props} />;
export const ClockIcon = (props: LucideProps) => <Clock {...base} {...props} />;
export const MenuIcon = (props: LucideProps) => <Menu {...base} {...props} />;
export const CloseIcon = (props: LucideProps) => <X {...base} {...props} />;

const SOCIAL_ICONS: Record<SocialPlatformId, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music2,
  google: Star,
  tripadvisor: Star,
  foodora: ShoppingBag,
  wolt: ShoppingBag,
  website: Globe,
};

export function SocialIcon({ platform, ...props }: LucideProps & { platform: string }) {
  const Icon = SOCIAL_ICONS[platform as SocialPlatformId] ?? Globe;
  return <Icon {...base} {...props} />;
}
