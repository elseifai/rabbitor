importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

function initFirebase(config) {
  if (!config?.apiKey || !config?.projectId) return
  if (firebase.apps.length > 0) return
  firebase.initializeApp(config)
  firebase.messaging()
}

const params = new URL(self.location.href).searchParams
initFirebase({
  apiKey: params.get('apiKey') || '',
  projectId: params.get('projectId') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    initFirebase(event.data.config)
  }
})
