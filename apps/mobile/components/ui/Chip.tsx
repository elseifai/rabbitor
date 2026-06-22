import { Pressable, Text } from 'react-native'

export function Chip({
  label,
  emoji,
  active,
  onPress,
}: {
  label: string
  emoji?: string
  active?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 flex-row items-center rounded-full border px-3.5 py-2 ${
        active ? 'border-brand bg-brand' : 'border-line bg-white'
      }`}
    >
      {emoji ? <Text className="mr-1 text-sm">{emoji}</Text> : null}
      <Text
        className={`text-[13px] font-semibold ${active ? 'text-white' : 'text-ink-soft'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
