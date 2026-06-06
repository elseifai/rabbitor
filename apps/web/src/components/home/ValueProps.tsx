import { Store, Truck, Shield, Percent } from 'lucide-react'

const PROPS = [
  {
    icon: Store,
    title: 'Local kiranas & markets',
    description: 'Support neighbourhood shops — groceries, fish, footwear, and more.',
  },
  {
    icon: Truck,
    title: 'Fast hyperlocal delivery',
    description: 'Shop delivery, Rabbitors, or partner fleets — vendor chooses.',
  },
  {
    icon: Percent,
    title: '0% commission at launch',
    description: 'Merchants keep more. Grow with subscriptions and boosts later.',
  },
  {
    icon: Shield,
    title: 'Privacy-first',
    description: 'Masked in-app contact. Addresses shared only after delivery.',
  },
]

export function ValueProps() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PROPS.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rabbit-50 text-rabbit-600">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
