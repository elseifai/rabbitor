import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { WebView, type WebViewNavigation } from 'react-native-webview'
import { StatusBar } from 'expo-status-bar'
import { WEB_APP_URL } from '../lib/web-app-url'
import { colors } from '../lib/theme'

const LOADER_MAX_MS = 8000

export function WebAppView() {
  const webRef = useRef<WebView>(null)
  const firstLoadDone = useRef(false)
  const [bootLoading, setBootLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setBootLoading(false), LOADER_MAX_MS)
    return () => clearTimeout(timer)
  }, [])

  const finishBootLoad = useCallback(() => {
    if (firstLoadDone.current) return
    firstLoadDone.current = true
    setBootLoading(false)
    setLoadError(null)
  }, [])

  const onNavChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack)
  }, [])

  const reload = useCallback(() => {
    setLoadError(null)
    setBootLoading(true)
    firstLoadDone.current = false
    webRef.current?.reload()
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack()
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [canGoBack])

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WebView
        ref={webRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        onLoadEnd={finishBootLoad}
        onNavigationStateChange={onNavChange}
        onError={() => {
          setBootLoading(false)
          setLoadError('Could not load the store. Check your internet connection.')
        }}
        onHttpError={() => {
          setBootLoading(false)
          setLoadError('The store page returned an error. Please try again.')
        }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled={Platform.OS === 'android'}
        cacheEnabled
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        originWhitelist={['https://*', 'http://*']}
        startInLoadingState={false}
        {...(Platform.OS === 'android' ? { cacheMode: 'LOAD_DEFAULT' as const } : {})}
        userAgent={
          Platform.OS === 'ios'
            ? undefined
            : 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36'
        }
      />
      {bootLoading && !loadError ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : null}
      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable style={styles.retryBtn} onPress={reload}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1, backgroundColor: '#fff' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  errorBox: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  errorText: {
    color: colors.inkMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})
