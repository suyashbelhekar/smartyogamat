// ─── Pressure Service ─────────────────────────────────────────────────────
// Subscribes to the Firebase Realtime Database path /pressure.
//
// Expected ESP data shape in Firebase:
//
//   pressure/
//     front/
//       fsr1: <number 0-1023>
//       fsr2: <number 0-1023>
//     middle/
//       fsr1: <number 0-1023>
//       fsr2: <number 0-1023>
//     back/
//       fsr1: <number 0-1023>
//       fsr2: <number 0-1023>

import { ref, onValue, off, type DatabaseReference } from 'firebase/database'
import { db } from '../lib/firebase'

export interface RegionData {
  fsr1: number   // raw ADC value 0–1023
  fsr2: number
}

export interface PressureSnapshot {
  front:  RegionData
  middle: RegionData
  back:   RegionData
  updatedAt: number  // Date.now() when we received this update
}

const DEFAULT_REGION: RegionData = { fsr1: 0, fsr2: 0 }

export const DEFAULT_SNAPSHOT: PressureSnapshot = {
  front:  { ...DEFAULT_REGION },
  middle: { ...DEFAULT_REGION },
  back:   { ...DEFAULT_REGION },
  updatedAt: 0,
}

function parseRegion(raw: unknown): RegionData {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    return {
      fsr1: typeof r['fsr1'] === 'number' ? Math.max(0, Math.min(1023, Math.round(r['fsr1']))) : 0,
      fsr2: typeof r['fsr2'] === 'number' ? Math.max(0, Math.min(1023, Math.round(r['fsr2']))) : 0,
    }
  }
  return { ...DEFAULT_REGION }
}

/**
 * Subscribe to live pressure data from Firebase.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * @param callback  Called every time new data arrives
 * @param onError   Called when the DB read fails (e.g. no config / offline)
 */
export function subscribePressure(
  callback: (snapshot: PressureSnapshot) => void,
  onError?: (err: Error) => void,
): () => void {
  let dbRef: DatabaseReference | null = null

  try {
    dbRef = ref(db, 'pressure')

    onValue(
      dbRef,
      (snap) => {
        const val = snap.val() as Record<string, unknown> | null

        if (!val) {
          callback({ ...DEFAULT_SNAPSHOT, updatedAt: Date.now() })
          return
        }

        callback({
          front:  parseRegion(val['front']),
          middle: parseRegion(val['middle']),
          back:   parseRegion(val['back']),
          updatedAt: Date.now(),
        })
      },
      (err) => {
        onError?.(err)
      },
    )
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)))
  }

  // Return unsubscribe
  return () => {
    if (dbRef) off(dbRef)
  }
}
