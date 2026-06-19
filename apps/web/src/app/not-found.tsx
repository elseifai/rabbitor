import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center bg-white px-6 text-center">
      <div className="text-7xl">🐰</div>
      <h1 className="mt-6 font-display text-5xl font-black text-[#FF6B35]">404</h1>
      <p className="mt-2 text-xl font-bold text-gray-900">Page not found</p>
      <p className="mt-2 text-sm text-gray-500">
        Looks like this page hopped away. Let&apos;s get you back on track.
      </p>
      <Link
        href="/"
        className="mt-8 flex h-12 items-center justify-center rounded-xl bg-[#FF6B35] px-8 text-base font-bold text-white shadow-lg shadow-orange-100 transition active:scale-95"
      >
        Back to home
      </Link>
    </div>
  )
}
