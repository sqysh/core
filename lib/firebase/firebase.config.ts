import { initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyCIaO3G_W52KSPSBS-GbjS-h7xaSEU9kLk',
  authDomain: 'coastal-referral-exchange.firebaseapp.com',
  projectId: 'coastal-referral-exchange',
  storageBucket: 'coastal-referral-exchange.firebasestorage.app',
  messagingSenderId: '298335120644',
  appId: '1:298335120644:web:8b5b0ad55954c2d93b3451',
  measurementId: 'G-ZX2ZYLXQYB'
}

const app = initializeApp(firebaseConfig)
const storage = getStorage(app)

export { storage }
