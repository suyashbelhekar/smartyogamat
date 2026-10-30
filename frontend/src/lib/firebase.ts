// ─── Firebase configuration ───────────────────────────────────────────────
// Replace these placeholder values with your actual Firebase project config.
// Find them in: Firebase Console → Project Settings → Your apps → SDK setup.

import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'

const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  databaseURL:       'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
}

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig)
export const db: Database             = getDatabase(firebaseApp)
