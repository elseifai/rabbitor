import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { api, getErrorMessage } from '@/lib/api'
import { saveToken } from '@/lib/auth'

export default function AuthScreen() {
  const router = useRouter()
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
    <View style={styles.container}>
      <Text style={styles.logo}>🐰 Rabbit</Text>
      <Text style={styles.subtitle}>Order from shops near you</Text>

      <View style={styles.phoneRow}>
        <Text style={styles.prefix}>+91</Text>
        <TextInput
          style={styles.phoneInput}
          placeholder="Mobile number"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
          editable={!otpSent}
        />
      </View>

      {!otpSent ? (
        <Pressable style={styles.button} disabled={loading} onPress={() => void sendOtp()}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send OTP</Text>
          )}
        </Pressable>
      ) : (
        <>
          <Text style={styles.otpLabel}>Enter 6-digit OTP</Text>
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => {
                  inputs.current[i] = el
                }}
                style={styles.otpBox}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(v) => onOtpChange(v, i)}
              />
            ))}
          </View>
          <Pressable style={styles.link} onPress={() => setOtpSent(false)}>
            <Text style={styles.linkText}>Change number</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  logo: { fontSize: 32, fontWeight: '800', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#6b7280', marginBottom: 32 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 16,
  },
  prefix: { paddingHorizontal: 14, fontWeight: '700', color: '#374151' },
  phoneInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
  button: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  otpLabel: { textAlign: 'center', marginBottom: 12, color: '#374151', fontWeight: '600' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  link: { alignItems: 'center' },
  linkText: { color: '#16a34a', fontWeight: '600' },
})
