import { useEffect, useRef } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { makeRedirectUri } from 'expo-auth-session'
import { api, getErrorMessage } from './api'
import { saveToken } from './auth'

WebBrowser.maybeCompleteAuthSession()

type GoogleRole = 'CUSTOMER' | 'RABBITOR'

export function useGoogleSignIn(
  scheme: 'rabbit' | 'rabbit-delivery',
  role: GoogleRole,
  onSuccess: () => void,
  onError: (message: string) => void,
) {
  const redirectUri = makeRedirectUri({ scheme })
  const handled = useRef(false)

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    scopes: ['openid', 'email', 'profile'],
    redirectUri,
  })

  useEffect(() => {
    if (response?.type !== 'success' || !response.params.code || handled.current) return
    if (!request?.redirectUri) return

    handled.current = true

    void (async () => {
      try {
        const { data } = await api.post<{
          success: boolean
          data: { accessToken: string; user: { role: string } }
        }>('/auth/google', {
          code: response.params.code,
          redirectUri: request.redirectUri,
          role,
        })

        if (data.data.user.role !== role) {
          onError(
            role === 'CUSTOMER'
              ? 'This app is for customers only.'
              : 'This app is for Rabbit delivery partners only.',
          )
          handled.current = false
          return
        }

        await saveToken(data.data.accessToken)
        onSuccess()
      } catch (err) {
        handled.current = false
        onError(getErrorMessage(err))
      }
    })()
  }, [response, request, role, onSuccess, onError])

  return {
    signInWithGoogle: () => {
      if (!request) {
        onError('Google sign-in is not configured.')
        return
      }
      void promptAsync()
    },
    ready: Boolean(request),
  }
}
