import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { api, getErrorMessage } from '@/lib/api'
import { saveToken } from '@/lib/auth'
import { colors } from '@/lib/theme'

export default function AuthScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const inputs = useRef<Array<TextInput | null>>([])

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      Alert.alert('Invalid phone', 'Enter a valid 10-digit mobile number.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/otp/send', { phone: digits })
      setOtpSent(true)
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (code: string) => {
    const digits = phone.replace(/\D/g, '')
    setLoading(true)
    try {
      const { data } = await api.post<{
        success: boolean
        data: { accessToken: string; user: { role: string } }
      }>('/auth/otp/verify', { phone: digits, code })
      if (data.data.user.role !== 'CUSTOMER') {
        Alert.alert('Access denied', 'This app is for customers only.')
        return
      }
      await saveToken(data.data.accessToken)
      router.replace('/(tabs)')
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const onOtpChange = (value: string, index: number) => {
    const next = [...otp]
    next[index] = value.replace(/\D/g, '').slice(-1)
    setOtp(next)
    if (value && index < 5) inputs.current[index + 1]?.focus()
    const code = next.join('')
    if (code.length === 6) void verifyOtp(code)
  }

  useEffect(() => {
    if (otpSent) inputs.current[0]?.focus()
  }, [otpSent])

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <View
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        className="flex-1 justify-center px-6"
      >
        {/* Brand */}
        <View className="mb-10 items-center">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand-50">
            <Text className="text-4xl">🐰</Text>
          </View>
          <Text className="mt-4 text-3xl font-black text-ink">Rabbitor</Text>
          <Text className="mt-1 text-sm text-ink-muted">
            Order from local shops near you
          </Text>
        </View>

        {!otpSent ? (
          <>
            <Text className="mb-2 text-sm font-bold text-ink">Mobile number</Text>
            <View className="flex-row items-center rounded-xl border-2 border-line bg-surface-subtle">
              <Text className="border-r border-line px-4 py-3.5 text-base font-extrabold text-ink-soft">
                +91
              </Text>
              <TextInput
                className="flex-1 px-4 py-3.5 text-base font-bold text-ink"
                placeholder="98765 43210"
                placeholderTextColor={colors.inkFaint}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
            </View>
            <Pressable
              className="mt-5 items-center rounded-xl bg-brand py-4 active:opacity-90"
              style={(loading || phone.replace(/\D/g, '').length !== 10) ? { opacity: 0.5 } : undefined}
              disabled={loading || phone.replace(/\D/g, '').length !== 10}
              onPress={() => void sendOtp()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-extrabold text-white">Get OTP</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text className="mb-1 text-center text-sm text-ink-muted">
              Enter the 6-digit code sent to
            </Text>
            <Text className="mb-5 text-center text-base font-extrabold text-ink">+91 {phone}</Text>
            <View className="flex-row justify-between">
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el
                  }}
                  className={`h-14 w-12 rounded-xl border-2 text-center text-xl font-black text-ink ${
                    digit ? 'border-brand bg-brand-50' : 'border-line bg-surface-subtle'
                  }`}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(v) => onOtpChange(v, i)}
                />
              ))}
            </View>
            {loading && <ActivityIndicator className="mt-5" color={colors.brand} />}
            <Pressable className="mt-6 items-center" onPress={() => setOtpSent(false)}>
              <Text className="text-sm font-bold text-brand">Change number</Text>
            </Pressable>
          </>
        )}

        <Text className="mt-10 text-center text-2xs text-ink-faint">
          By continuing you agree to Rabbitor&apos;s Terms & Privacy Policy
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}
