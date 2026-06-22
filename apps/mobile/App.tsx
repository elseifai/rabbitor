import { SafeAreaProvider } from 'react-native-safe-area-context'
import { WebAppView } from './components/WebAppView'

export default function App() {
  return (
    <SafeAreaProvider>
      <WebAppView />
    </SafeAreaProvider>
  )
}
