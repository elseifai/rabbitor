export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function uniqueShopSlug(
  baseName: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugifyName(baseName) || 'shop'
  let slug = base
  let n = 2
  while (await exists(slug)) {
    slug = `${base}-${n}`
    n++
  }
  return slug
}

export function parsePrepMinutes(time?: string): number {
  if (!time) return 20
  const match = time.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 20
}
