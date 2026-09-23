import Image from 'next/image';
import { preload } from 'react-dom';
import { cn } from '@/lib/cn';
import type { MenuImage } from '@/lib/menu/types';

/**
 * Renders a menu image from either source with the same guarantees: reserved aspect ratio (no
 * layout shift), a blurred preview painted immediately (no empty frame), responsive candidates,
 * and AVIF/WebP. Uploaded images come from the media store's pre-rendered variants through a
 * <picture>; seed images go through next/image.
 */
export function MenuPicture({
  image,
  alt,
  sizes,
  className,
  priority = false,
}: {
  image: MenuImage;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  if (image.kind === 'static') {
    return (
      <Image
        src={image.image}
        alt={alt}
        sizes={sizes}
        placeholder="blur"
        priority={priority}
        fetchPriority={priority ? 'high' : undefined}
        className={cn('size-full object-cover', className)}
      />
    );
  }

  const avif = image.variants.filter((variant) => variant.format === 'avif');
  const webp = image.variants.filter((variant) => variant.format === 'webp');
  const fallback = webp[webp.length - 1] ?? image.variants[image.variants.length - 1];
  const srcSet = (list: typeof avif) =>
    list.map((variant) => `${variant.src} ${variant.width}w`).join(', ');
  // A priority image is announced in <head>, so the download starts before the markup reaches it.
  // The typed preload is skipped by browsers without AVIF; they fall through to the WebP source.
  const preferred = avif.length > 0 ? avif : webp;
  const largest = preferred[preferred.length - 1];
  if (priority && largest) {
    preload(largest.src, {
      as: 'image',
      imageSrcSet: srcSet(preferred),
      imageSizes: sizes,
      type: avif.length > 0 ? 'image/avif' : 'image/webp',
      fetchPriority: 'high',
    });
  }

  return (
    <picture className="contents">
      {avif.length > 0 ? <source type="image/avif" srcSet={srcSet(avif)} sizes={sizes} /> : null}
      {webp.length > 0 ? <source type="image/webp" srcSet={srcSet(webp)} sizes={sizes} /> : null}
      <img
        src={fallback?.src}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={cn('size-full object-cover', className)}
        style={{
          backgroundColor: image.dominantColor,
          backgroundImage: `url(${image.blurDataUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    </picture>
  );
}
