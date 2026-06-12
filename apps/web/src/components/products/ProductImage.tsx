import { cn } from '@/lib/utils'

// LIVE ECOSYSTEM UPGRADE — standardized product image container
const IMG_CLASS = 'h-full w-full object-cover'
const CONTAINER_CLASS = 'w-full aspect-square overflow-hidden rounded-lg bg-gray-100'

export function ProductImage({
  src,
  alt = '',
  fallback = '📦',
  className,
  imgClassName,
}: {
  src?: string | null
  alt?: string
  fallback?: string
  className?: string
  imgClassName?: string
}) {
  return (
    <div className={cn(CONTAINER_CLASS, className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn(IMG_CLASS, imgClassName)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl">{fallback}</div>
      )}
    </div>
  )
}

export const PRODUCT_IMAGE_CONTAINER = CONTAINER_CLASS
export const PRODUCT_IMAGE_IMG = `w-full aspect-square object-cover rounded-lg bg-gray-100`
