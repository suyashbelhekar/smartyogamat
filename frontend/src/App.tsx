import { useCallback, useEffect, useRef, useState } from 'react'

import { drawPose, fitCanvas } from './lib/drawPose'
import {
  POSE_META,
  POSE_CLASSES,
  POSE_IMAGES,
  STANDING_POSES,
  SITTING_POSES,
  FLOOR_POSES,
  type PoseClassId,
} from './lib/landmarks'
import { usePoseClassifier, type AppIssue } from './hooks/usePoseClassifier'
import { voiceCoach, type VoiceMode } from './lib/voiceCoach'
import { historyStorage } from './services/historyStorage'
import { useSessionTracker } from './hooks/useSessionTracker'
import { SessionSummaryModal } from './components/SessionSummaryModal'
import { HistoryAndProgress } from './components/HistoryAndProgress'
import { PressureData } from './components/PressureData'
import { HomeSection } from './components/HomeSection'
import type { SessionSummaryData } from './types/session'

// ─── Reference images per pose (Wikipedia Commons — reliable & CORS-friendly) ──
const POSE_REF_IMAGES: Record<PoseClassId, string> = POSE_IMAGES

// ─── helpers ─────────────────────────────────────────────────────────────────

function issueText(issue: AppIssue): { en: string; mr: string } | null {
  switch (issue) {
    case 'loading':          return { en: 'Loading pose model…',                         mr: 'मॉडेल लोड होत आहे…' }
    case 'requesting-camera':return { en: 'Requesting camera access…',                   mr: 'कॅमेऱ्याची परवानगी मागत आहे…' }
    case 'camera-denied':    return { en: 'Camera blocked. Allow access and retry.',      mr: 'कॅमेरा परवानगी नाकारली.' }
    case 'camera-missing':   return { en: 'No camera found. Connect a webcam.',           mr: 'कॅमेरा सापडला नाही.' }
    case 'camera-in-use':    return { en: 'Camera in use by another application.',        mr: 'कॅमेरा दुसऱ्या ॲपमध्ये सुरू आहे.' }
    case 'camera-error':     return { en: 'Could not start camera or pose model.',        mr: 'कॅमेरा सुरू होऊ शकला नाही.' }
    case 'no-person':        return { en: 'No person detected. Keep full body in frame.', mr: 'व्यक्ती दिसत नाही. पूर्ण शरीर कॅमेऱ्यात ठेवा.' }
    default:                 return null
  }
}

export type NavTab = 'home' | 'camera' | 'pressure' | 'poses' | 'history' | 'settings'

interface NavItemDef {
  id: NavTab
  label: string
  sublabel: string
  icon: string
}

const NAV_ITEMS: NavItemDef[] = [
  { id: 'home',     label: 'Home',                sublabel: 'Studio overview',         icon: '✦' },
  { id: 'camera',   label: 'Live Yoga Coach',     sublabel: 'Vision cockpit',          icon: '📷' },
  { id: 'pressure', label: 'Pressure Monitoring', sublabel: 'IoT mat telemetry',       icon: '🦶' },
  { id: 'poses',    label: 'Pose Library',        sublabel: 'Asana curriculum',        icon: '📋' },
  { id: 'history',  label: 'Progress Reports',    sublabel: 'Analytics & records',     icon: '📊' },
  { id: 'settings', label: 'Settings',            sublabel: 'Voice & audio',           icon: '⚙️' },
]

// ─── App Component ────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab]       = useState<NavTab>('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [targetId, setTargetId]         = useState<PoseClassId | null>('downdog')

  const session           = usePoseClassifier(targetId)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef          = useRef<HTMLCanvasElement>(null)
  const landmarksRef       = useRef(session.landmarks)
  landmarksRef.current     = session.landmarks

  const [filter, setFilter] = useState<'standing' | 'sitting' | 'floor' | 'all'>('all')

  const [voiceMode, setVoiceMode]               = useState<VoiceMode>('en')
  const [pendingVoiceMode, setPendingVoiceMode] = useState<VoiceMode>('en')
  const [isFullscreen, setIsFullscreen]         = useState(false)
  const [refImgError, setRefImgError]           = useState<Record<string, boolean>>({})
  const [showRefThumbnail, setShowRefThumbnail] = useState(true)

  const prevMatchedRef  = useRef(false)

  const [sessions, setSessions]               = useState<SessionSummaryData[]>(() => historyStorage.getStoredSessions())
  const [activeSummary, setActiveSummary]     = useState<SessionSummaryData | null>(null)
  const [newestSessionId, setNewestSessionId] = useState<string | null>(null)

  const tracking   = session.issue === 'tracking'
  const matched    = tracking && session.guidance.matched
  const isSettling = tracking && session.guidance.isSettling
  const guideId    = targetId ?? session.label
  const guide      = guideId ? POSE_META[guideId] : null

  const tracker = useSessionTracker({
    isRunning:       session.running,
    isTracking:      tracking,
    isMatched:       matched,
    poseId:          guideId ?? 'downdog',
    landmarks:       session.landmarks,
    currentScore:    session.guidance.score,
    liveProgress:    session.liveProgress,
    countdownActive: session.countdownActive,
  })

  // ── fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!videoContainerRef.current) return
    try {
      if (!document.fullscreenElement) await videoContainerRef.current.requestFullscreen()
      else await document.exitFullscreen()
    } catch (err) { console.error('Fullscreen failed:', err) }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(document.fullscreenElement === videoContainerRef.current)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ── canvas draw loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const video  = session.videoRef.current
    if (!canvas || !video) return
    let frame = 0
    const draw = () => {
      const w = video.videoWidth  || canvas.parentElement?.clientWidth  || 640
      const h = video.videoHeight || canvas.parentElement?.clientHeight || 480
      fitCanvas(canvas, w, h)
      const ctx = canvas.getContext('2d')
      if (ctx) drawPose(ctx, landmarksRef.current, true, matched, session.frozenState.isFrozen, session.guidance.detailedCues, session.countdownActive)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [session.videoRef, matched, session.frozenState.isFrozen, session.guidance.detailedCues, session.countdownActive])

  // ── voice session lifecycle: immediate cancellation when session/camera stops or tab changes ──
  useEffect(() => {
    if (!session.running || activeTab !== 'camera' || !tracking || session.countdownActive) {
      voiceCoach.stopSession()
    } else {
      voiceCoach.startSession()
    }
  }, [session.running, activeTab, tracking, session.countdownActive])

  // Stop voice immediately on unmount
  useEffect(() => {
    return () => {
      voiceCoach.stopSession()
    }
  }, [])

  // ── voice coaching: commands ONLY when person is doing pose to make them correct ──
  useEffect(() => {
    // Only command when camera is running, user is in camera tab, person is in frame, and not in 5s scan or settling
    if (
      voiceMode === 'off' ||
      !session.running ||
      activeTab !== 'camera' ||
      !tracking ||
      session.countdownActive ||
      isSettling
    ) {
      return
    }

    // 1. When pose form is fully matched: confirm once
    if (matched && !prevMatchedRef.current) {
      prevMatchedRef.current = true
      if (guide) {
        voiceCoach.speakPoseMatch(guide.name, guide.sanskrit, voiceMode)
      }
      return
    }

    if (!matched) {
      prevMatchedRef.current = false
    }

    // 2. Active posture corrections: every 4.5 seconds, if there is an active mistake, command the correction!
    const id = window.setInterval(() => {
      if (!session.running || activeTab !== 'camera' || !tracking || session.countdownActive || isSettling || matched) {
        return
      }

      const cueEn = session.guidance.cues[0]
      const cueMr = session.guidance.cuesMr[0] ?? session.guidance.detailedCues[0]?.mr
      if (cueEn) {
        voiceCoach.speakCorrection(cueEn, cueMr, voiceMode)
      }
    }, 4500)

    return () => window.clearInterval(id)
  }, [
    voiceMode,
    session.running,
    activeTab,
    tracking,
    session.countdownActive,
    isSettling,
    matched,
    guide,
    session.guidance.cues,
    session.guidance.cuesMr,
    session.guidance.detailedCues,
  ])

  // ── session callbacks ─────────────────────────────────────────────────────
  const handleStopSession = useCallback(() => {
    voiceCoach.stopSession()
    const summary = tracker.createSessionSummary(guideId ?? 'downdog')
    session.stop()
    if (summary) {
      historyStorage.saveSession(summary)
      setSessions(historyStorage.getStoredSessions())
      setNewestSessionId(summary.id)
      setActiveSummary(summary)
    }
  }, [session, tracker, guideId])

  const handleStartSession = useCallback((poseId?: PoseClassId) => {
    if (poseId) {
      setTargetId(poseId)
    }
    setActiveTab('camera')
    if (!session.running) {
      void session.start()
    }
  }, [session])

  const handleDeleteSession = useCallback((id: string) => {
    historyStorage.deleteSession(id)
    setSessions(historyStorage.getStoredSessions())
  }, [])

  const handleClearAllSessions = useCallback(() => {
    historyStorage.clearAllSessions()
    setSessions([])
    setNewestSessionId(null)
  }, [])

  // ── derived ───────────────────────────────────────────────────────────────
  const filteredPoseIds =
    filter === 'standing' ? STANDING_POSES :
    filter === 'sitting'  ? SITTING_POSES  :
    filter === 'floor'    ? FLOOR_POSES    :
    POSE_CLASSES

  const match         = tracking ? Math.round(session.guidance.score * 100) : null
  const issueInfo     = issueText(session.issue)
  const predictedName = session.label ? POSE_META[session.label].name : null
  const refImgSrc     = guideId ? POSE_REF_IMAGES[guideId] : null

  return (
    <div className="min-h-screen flex flex-col bg-[#040506] text-white selection:bg-[#ff6363]/30 selection:text-white">

      {/* ═══════════════════════════════════════════════════════════════════════
          1. FLOATING GLASS NAVIGATION BAR (Raycast Glass Bar Style)
      ════════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 w-full px-3 py-3 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="glass-nav rounded-2xl px-3.5 py-2 sm:px-5 flex items-center justify-between key-shadow transition-all duration-300">
            
            {/* Logo / Brand */}
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 text-left group"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#363739] bg-[#111214] text-xs font-mono font-bold text-[#ff6363] shadow-[0_0_12px_rgba(255,99,99,0.35)] transition-transform group-hover:scale-105">
                ◆
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-white group-hover:text-stone-200 transition-colors">
                  SmartYoga AI
                </span>
                <span className="hidden md:inline-block rounded-md border border-[#363739] bg-[#1b1c1e] px-1.5 py-0.5 text-[10px] font-mono text-[#9c9c9d]">
                  STUDIO
                </span>
              </div>
            </button>

            {/* Desktop Horizontal Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = activeTab === item.id
                const badge  = item.id === 'history' && sessions.length > 0 ? sessions.length : null

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#1b1c1e] text-white key-shadow'
                        : 'text-[#9c9c9d] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{item.label}</span>
                    {badge != null && (
                      <span className="ml-1 rounded-full bg-[#363739] px-1.5 py-0.2 text-[10px] font-mono text-white">
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Right Status / Action Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Running Session Live Indicator */}
              {session.running ? (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 px-3 py-1 text-xs font-mono font-medium text-rose-300">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>
                    {Math.floor(tracker.elapsedSec / 60)}:{String(tracker.elapsedSec % 60).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={handleStopSession}
                    className="ml-1 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700 transition-colors"
                  >
                    Stop &amp; Save
                  </button>
                </div>
              ) : (
                /* Primary CTA button (Mist fill, Iron text per DESIGN.md lines 148-152) */
                <button
                  type="button"
                  onClick={() => handleStartSession()}
                  className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-[#e6e6e6] px-3.5 py-1.5 text-xs font-semibold text-[#1b1c1e] transition-all hover:bg-white hover:scale-[1.02] active:scale-[0.98] key-shadow"
                >
                  <span>🧘</span>
                  <span>Start Yoga Session</span>
                </button>
              )}

              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex lg:hidden items-center justify-center rounded-lg border border-[#363739] bg-[#111214] p-2 text-stone-300 hover:text-white"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>

          </div>

          {/* Mobile Drawer Menu */}
          {mobileMenuOpen && (
            <div className="mt-2 flex flex-col gap-1 rounded-2xl border border-[#363739] bg-[#07080a] p-3 shadow-2xl lg:hidden key-shadow">
              {NAV_ITEMS.map((item) => {
                const active = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#1b1c1e] text-white font-semibold'
                        : 'text-[#9c9c9d] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] text-[#6a6b6c]">{item.sublabel}</span>
                  </button>
                )
              })}

              {!session.running && (
                <button
                  type="button"
                  onClick={() => {
                    handleStartSession()
                    setMobileMenuOpen(false)
                  }}
                  className="mt-2 w-full rounded-xl bg-[#e6e6e6] py-2.5 text-xs font-semibold text-[#1b1c1e] text-center"
                >
                  Start Yoga Session
                </button>
              )}
            </div>
          )}

        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. MAIN ACTIVE SECTION CONTENT
      ════════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col">

        {/* ── TAB 1: HOME (LANDING PAGE) ─────────────────────────────────── */}
        {activeTab === 'home' && (
          <HomeSection
            onStartSession={(id) => handleStartSession(id)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            heroImageSrc="/images/yogaimage.jpg"
          />
        )}

        {/* ── TAB 2: LIVE YOGA COACH (VISION COCKPIT) ────────────────────── */}
        {activeTab === 'camera' && (
          <div className="flex-1 flex flex-col bg-[#040506]">
            
            {/* Top Cockpit Control Strip */}
            <div className="w-full border-b border-[#363739] bg-[#07080a]/90 px-4 py-3 sm:px-6 backdrop-blur-md">
              <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
                
                {/* Left: Pose Selector Dropdown & Info */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#ff6363]">TARGET:</span>
                    <select
                      value={guideId ?? 'downdog'}
                      onChange={(e) => {
                        voiceCoach.cancel()
                        setTargetId(e.target.value as PoseClassId)
                      }}
                      className="rounded-lg border border-[#363739] bg-[#111214] px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-[#ff6363] key-shadow-subtle"
                    >
                      {POSE_CLASSES.map((id) => (
                        <option key={id} value={id}>
                          {POSE_META[id].name} ({POSE_META[id].sanskrit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Predicted Pose Label Pill */}
                  {tracking && predictedName && predictedName !== guide?.name && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-950/60 px-3 py-1 text-[10px] font-mono text-violet-300">
                      <span>Detected:</span>
                      <strong className="text-white">{predictedName}</strong>
                    </span>
                  )}
                </div>

                {/* Right: Live Telemetry Badges & Cockpit Buttons */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {tracking && (
                    <>
                      {session.countdownActive ? (
                        <span className="rounded-lg px-2.5 py-1 text-xs font-mono font-bold tabular-nums border border-sky-500/50 bg-sky-950/60 text-sky-300 animate-pulse">
                          ANALYZING: {session.countdownRemainingSec}s
                        </span>
                      ) : (
                        <>
                          {/* Pose Match % */}
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold tabular-nums border ${
                            matched
                              ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-400'
                              : 'border-[#363739] bg-[#111214] text-white'
                          }`}>
                            MATCH: {match}%
                          </span>

                          {/* Corrections Fixed */}
                          {session.liveProgress.correctionsCount > 0 && (
                            <span className="hidden md:inline-block rounded-lg border border-teal-500/40 bg-teal-950/50 px-2.5 py-1 text-xs font-mono font-bold tabular-nums text-teal-300">
                              ✓ {session.liveProgress.correctionsCount} Fixed
                            </span>
                          )}

                          {/* Mat Balance % */}
                          <span className="hidden sm:inline-block rounded-lg border border-[#363739] bg-[#111214] px-2.5 py-1 text-xs font-mono font-bold tabular-nums text-sky-400">
                            MAT: {tracker.liveBalance.instantScore}%
                          </span>
                        </>
                      )}

                      {/* Timer */}
                      <span className="rounded-lg border border-[#363739] bg-[#111214] px-2.5 py-1 text-xs font-mono font-bold tabular-nums text-amber-300">
                        ⏱ {Math.floor(tracker.elapsedSec / 60)}:{String(tracker.elapsedSec % 60).padStart(2, '0')}
                      </span>
                    </>
                  )}

                  {/* Status Pill */}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-mono font-bold border ${
                    !tracking               ? 'border-[#363739] bg-[#111214] text-[#9c9c9d]' :
                    session.countdownActive ? 'border-sky-500/60 bg-sky-950/80 text-sky-300' :
                    matched                 ? 'border-emerald-500/50 bg-emerald-950/80 text-emerald-300' :
                    isSettling              ? 'border-amber-500/50 bg-amber-950/80 text-amber-300' :
                                              'border-sky-500/50 bg-sky-950/80 text-sky-300'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      !tracking               ? 'bg-[#6a6b6c]' :
                      session.countdownActive ? 'animate-ping bg-sky-400' :
                      matched                 ? 'animate-pulse bg-emerald-400' :
                      isSettling              ? 'animate-ping bg-amber-400' :
                                                'animate-ping bg-sky-400'
                    }`} />
                    {!tracking ? 'STANDBY' : session.countdownActive ? `ANALYZING (${session.countdownRemainingSec}s)` : matched ? 'MATCHED' : isSettling ? `SETTLING ${session.guidance.settlingRemainingSec ?? 2}s` : 'ALIGNING'}
                  </span>

                  {/* Freeze / Unfreeze Toggle */}
                  {session.frozenState.isFrozen && (
                    <button
                      type="button"
                      onClick={() => session.unfreeze()}
                      className="rounded-lg border border-teal-500/50 bg-teal-950/60 px-3 py-1 text-xs font-semibold text-teal-300 hover:bg-teal-900 transition-colors"
                    >
                      Resume Live
                    </button>
                  )}

                  {/* Reference Image Toggle Button */}
                  {guide && (
                    <button
                      type="button"
                      onClick={() => setShowRefThumbnail(!showRefThumbnail)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-mono transition-colors ${
                        showRefThumbnail
                          ? 'border-[#ff6363]/40 bg-[#452324] text-white'
                          : 'border-[#363739] bg-[#111214] text-[#9c9c9d] hover:text-white'
                      }`}
                      title="Toggle pose visual reference"
                    >
                      Ref
                    </button>
                  )}

                  {/* Start / Stop Camera Action Button */}
                  <button
                    type="button"
                    onClick={() => session.running ? handleStopSession() : void session.start()}
                    className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all key-shadow ${
                      session.running
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-[#e6e6e6] text-[#1b1c1e] hover:bg-white'
                    }`}
                  >
                    {session.running ? 'Stop & Save' : 'Start Camera'}
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="rounded-lg border border-[#363739] bg-[#111214] px-2.5 py-1 text-xs font-mono text-[#9c9c9d] hover:text-white transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  >
                    {isFullscreen ? '⊡' : '⊞'}
                  </button>
                </div>

              </div>
            </div>

            {/* Main Video Viewport & Overlays */}
            <div
              ref={videoContainerRef}
              className={`relative flex-1 w-full bg-[#040506] overflow-hidden min-h-[480px] sm:min-h-[580px] ${
                isFullscreen ? 'fixed inset-0 z-50' : ''
              }`}
            >
              {/* Mirrored webcam stream & skeleton canvas */}
              <div className="absolute inset-0 -scale-x-100 flex items-center justify-center">
                <video
                  ref={session.videoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>

              {/* Floating Pose Reference Card (Top-Right) */}
              {guide && refImgSrc && showRefThumbnail && !refImgError[guideId ?? ''] && (
                <div
                  className="absolute right-4 top-4 z-30 overflow-hidden rounded-2xl border border-[#363739] bg-[#07080a] shadow-2xl key-shadow animate-hero-reveal"
                  style={{ width: 140 }}
                >
                  <div className="flex items-center justify-between border-b border-[#363739] bg-[#111214] px-2.5 py-1">
                    <span className="text-[10px] font-mono font-bold text-[#ff6363]">ASANA REF</span>
                    <button
                      type="button"
                      onClick={() => setShowRefThumbnail(false)}
                      className="text-[10px] text-[#6a6b6c] hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <img
                    src={refImgSrc}
                    alt={`${guide.name} reference`}
                    className="h-24 w-full object-cover object-center"
                    onError={() => setRefImgError(prev => ({ ...prev, [guideId ?? '']: true }))}
                  />
                  <div className="p-1.5 text-center bg-[#07080a]">
                    <p className="truncate text-[10px] font-semibold text-white">{guide.name}</p>
                    <p className="truncate text-[9px] font-mono text-[#9c9c9d]">{guide.sanskrit}</p>
                  </div>
                </div>
              )}

              {/* 5-SECOND INITIAL POSTURE SCANNER OVERLAY */}
              {session.countdownActive && tracking && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] animate-hero-reveal pointer-events-none select-none">
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing ring background */}
                    <div className="absolute h-36 w-36 rounded-full bg-sky-500/15 animate-ping opacity-40" />
                    
                    {/* SVG Progress Ring */}
                    <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="#1e293b"
                        strokeWidth="6"
                        fill="rgba(7, 8, 10, 0.85)"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="#38bdf8"
                        strokeWidth="6"
                        strokeDasharray={264}
                        strokeDashoffset={264 * (1 - session.countdownProgress)}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-100 ease-linear"
                      />
                    </svg>

                    {/* Countdown Digits */}
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="font-mono text-4xl font-extrabold tabular-nums tracking-tight text-white drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]">
                        {session.countdownRemainingSec}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                        SEC
                      </span>
                    </div>
                  </div>

                  {/* Scan Status Notice */}
                  <div className="mt-4 flex flex-col items-center gap-1.5 text-center px-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-950/80 px-3.5 py-1 text-xs font-mono font-bold text-sky-300 shadow-lg">
                      <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                      <span>INITIAL BODY POSTURE SCAN</span>
                    </div>
                    <p className="max-w-xs text-xs text-stone-300 drop-shadow">
                      Stand in position. AI is scanning your body landmarks and joint alignment...
                    </p>
                    <span className="rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-mono text-[#9c9c9d]">
                      No score or match evaluated during initial 5s
                    </span>
                  </div>
                </div>
              )}

              {/* Floating Live Posture Analytics HUD (Bottom-Left) */}
              {!session.countdownActive && tracking && (
                <div className="absolute bottom-20 left-4 z-20 flex flex-col gap-2 max-w-[280px] sm:max-w-[320px] animate-hero-reveal">
                  {/* Gauge & Metrics Card */}
                  <div className="rounded-2xl border border-[#363739] bg-[#07080a]/92 p-3.5 backdrop-blur-md key-shadow">
                    <div className="flex items-center justify-between pb-2 border-b border-[#363739]/60">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#ff6363] animate-pulse" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ff6363]">
                          Live Posture Engine
                        </span>
                      </div>
                      {session.liveProgress.improvementPct !== 0 && (
                        <span className={`text-[10px] font-mono font-bold ${
                          session.liveProgress.improvementPct > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {session.liveProgress.improvementPct > 0 ? '▲ +' : '▼ '}
                          {session.liveProgress.improvementPct}%
                        </span>
                      )}
                    </div>

                    {/* Accuracy and Balance Columns */}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#9c9c9d]">Accuracy</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className={`text-2xl font-bold font-mono tabular-nums leading-none ${
                            matched ? 'text-emerald-400' : match && match >= 75 ? 'text-sky-300' : 'text-white'
                          }`}>
                            {match}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1b1c1e]">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              matched ? 'bg-emerald-400' : match && match >= 75 ? 'bg-sky-400' : 'bg-[#ff6363]'
                            }`}
                            style={{ width: `${match}%` }}
                          />
                        </div>
                      </div>

                      <div className="border-l border-[#363739]/60 pl-3">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#9c9c9d]">Corrections</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-2xl font-bold font-mono tabular-nums leading-none text-teal-300">
                            {session.liveProgress.correctionsCount}
                          </span>
                          <span className="text-[10px] font-mono text-[#9c9c9d]">fixed</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#6a6b6c] mt-1 block">
                          Mat: {tracker.liveBalance.instantScore}%
                        </span>
                      </div>
                    </div>

                    {/* Joint Group Alignment Sub-scores */}
                    {session.postureEvaluation && (
                      <div className="mt-3 pt-2.5 border-t border-[#363739]/60 grid grid-cols-3 gap-1.5 text-center text-[9px] font-mono">
                        <div className="rounded-lg bg-[#111214] p-1 border border-[#363739]/40">
                          <span className="text-[#9c9c9d]">ARMS</span>
                          <p className="font-bold text-white mt-0.5">{session.postureEvaluation.alignmentDetails.armsScore}%</p>
                        </div>
                        <div className="rounded-lg bg-[#111214] p-1 border border-[#363739]/40">
                          <span className="text-[#9c9c9d]">CORE</span>
                          <p className="font-bold text-white mt-0.5">{session.postureEvaluation.alignmentDetails.coreScore}%</p>
                        </div>
                        <div className="rounded-lg bg-[#111214] p-1 border border-[#363739]/40">
                          <span className="text-[#9c9c9d]">LEGS</span>
                          <p className="font-bold text-white mt-0.5">{session.postureEvaluation.alignmentDetails.legsScore}%</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Mistakes / Corrections List */}
                  {(session.liveProgress.activeMistakes.length > 0 || session.guidance.detailedCues.length > 0) && (
                    <div className="rounded-xl border border-[#363739] bg-[#07080a]/92 p-2.5 backdrop-blur-md key-shadow max-h-36 overflow-y-auto space-y-1.5">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#9c9c9d] block mb-1">
                        Active Corrections ({session.liveProgress.activeMistakes.length || session.guidance.detailedCues.length})
                      </span>
                      {session.liveProgress.activeMistakes.length > 0 ? (
                        session.liveProgress.activeMistakes.slice(0, 2).map((m) => (
                          <div
                            key={m.id}
                            className="flex flex-col gap-0.5 rounded-lg border border-amber-500/40 bg-amber-950/40 text-amber-200 p-1.5 text-[10px]"
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span>👉 {m.cueEn}</span>
                              {m.deviationDeg > 0 && (
                                <span className="font-mono text-[9px] text-[#9c9c9d] ml-1">
                                  ±{Math.round(m.deviationDeg)}°
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] opacity-75 font-mono">{m.cueMr}</span>
                          </div>
                        ))
                      ) : (
                        session.guidance.detailedCues.slice(0, 2).map((cue) => (
                          <div
                            key={cue.id}
                            className="flex flex-col gap-0.5 rounded-lg border border-amber-500/40 bg-amber-950/40 text-amber-200 p-1.5 text-[10px]"
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span>👉 {cue.en}</span>
                            </div>
                            <span className="text-[9px] opacity-75 font-mono">{cue.mr}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Cue Guidance Banner */}
              <div className="absolute bottom-3 left-3 right-3 sm:left-6 sm:right-6 z-20">
                <div className={`mx-auto max-w-3xl rounded-2xl border px-6 py-3.5 text-center backdrop-blur-md transition-all key-shadow ${
                  issueInfo               ? 'border-amber-500/40 bg-amber-950/85 text-amber-200' :
                  session.countdownActive ? 'border-sky-500/60 bg-sky-950/85 text-sky-200' :
                  matched                 ? 'border-emerald-500/40 bg-emerald-950/85 text-emerald-200' :
                  isSettling              ? 'border-sky-500/40 bg-sky-950/85 text-sky-200' :
                  session.guidance.cues.length > 0 ? 'border-rose-500/40 bg-[#07080a]/92 text-white' :
                  tracking                ? 'border-[#363739] bg-[#07080a]/90 text-white' :
                                            'border-[#363739] bg-[#07080a]/90 text-[#9c9c9d]'
                }`}>
                  {issueInfo ? (
                    <p className="text-sm font-medium">
                      {issueInfo.en} <span className="opacity-75 font-mono">· {issueInfo.mr}</span>
                    </p>
                  ) : session.countdownActive ? (
                    <div>
                      <p className="text-sm font-semibold text-sky-300">
                        ⏳ Initial 5-second body scan in progress… ({session.countdownRemainingSec}s remaining)
                      </p>
                      <p className="text-xs text-sky-400/80 mt-0.5">
                        कॅमेऱ्यासमोर स्थिर उभे राहा. सुरुवातीचे ५ सेकंद शरीराची स्थिती स्कॅन होत आहे.
                      </p>
                    </div>
                  ) : matched ? (
                    <div>
                      <p className="text-sm font-semibold text-emerald-300">
                        🎯 Perfect form! ({match}% Accuracy) Hold this posture steadily and breathe calmly.
                      </p>
                      <p className="text-xs text-emerald-400/80 mt-0.5">
                        अभिनंदन! आसन अचूक आहे ({match}% अचूकता). शांत श्वासासह ही मुद्रा धरा.
                      </p>
                    </div>
                  ) : session.guidance.cues.length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold text-white">
                        👉 {session.guidance.cues[0]}
                        {session.guidance.cues[1] && (
                          <span className="text-[#9c9c9d] font-normal"> · {session.guidance.cues[1]}</span>
                        )}
                      </p>
                      <p className="text-xs text-amber-400/90 mt-0.5">
                        {session.guidance.detailedCues[0]?.mr ?? 'पोश्चर सुधारा: निर्देशानुसार शरीराची स्थिती जुळवा.'}
                      </p>
                    </div>
                  ) : isSettling ? (
                    <div>
                      <p className="text-sm font-semibold text-sky-300">
                        ⏳ Settling into pose… ({session.guidance.settlingRemainingSec}s) — stabilize your balance.
                      </p>
                      <p className="text-xs text-sky-400/80 mt-0.5">
                        आसनात हळूहळू स्थिर व्हा.
                      </p>
                    </div>
                  ) : tracking ? (
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {guide ? `Align your body into ${guide.name} — real-time AI feedback active.` : 'Align your posture with the selected pose.'}
                      </p>
                      <p className="text-xs text-[#9c9c9d] mt-0.5 font-mono">
                        {guide ? `${guide.sanskrit} — आवाज आणि दिशादर्शक सूचना सुरू आहेत.` : 'आसन निवडा.'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-[#9c9c9d]">
                      Press <span className="font-bold text-white">Start Camera</span> to initialize webcam pose detection and begin practice.
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── TAB 3: PRESSURE MONITORING ─────────────────────────────────── */}
        {activeTab === 'pressure' && (
          <div className="flex-1 bg-[#040506]">
            <PressureData />
          </div>
        )}

        {/* ── TAB 4: POSE LIBRARY ────────────────────────────────────────── */}
        {activeTab === 'poses' && (
          <div className="flex-1 bg-[#040506] w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            {/* Header & Filter Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#363739]/60 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#ff6363]" />
                  <span className="text-xs font-mono uppercase tracking-widest text-[#ff6363]">Curriculum</span>
                </div>
                <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  Classical Pose Library
                </h2>
                <p className="mt-1 text-sm text-[#9c9c9d]">
                  Select an asana to calibrate target joint angles and jump straight into live camera practice.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 rounded-xl border border-[#363739] bg-[#111214] p-1 self-start sm:self-auto">
                {(['all', 'standing', 'sitting', 'floor'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-medium capitalize transition-all ${
                      filter === f
                        ? 'bg-[#e6e6e6] text-[#1b1c1e] font-semibold key-shadow'
                        : 'text-[#9c9c9d] hover:text-white'
                    }`}
                  >
                    {f === 'standing' ? 'Standing' : f === 'sitting' ? 'Sitting' : f === 'floor' ? 'Floor' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Pose Card Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPoseIds.map((id) => {
                const meta     = POSE_META[id]
                const selected = targetId === id
                const score    = Math.round(session.scores[id] * 100)
                const refImg   = POSE_REF_IMAGES[id]

                return (
                  <div
                    key={id}
                    className={`group flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 key-shadow ${
                      selected
                        ? 'border-[#ff6363] bg-[#07080a]'
                        : 'border-[#363739] bg-[#07080a] hover:border-[#454647]'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    {refImg && !refImgError[id] && (
                      <div className="relative h-44 w-full overflow-hidden bg-[#040506]">
                        <img
                          src={refImg}
                          alt={`${meta.name} (${meta.sanskrit}) yoga pose reference`}
                          className="h-full w-full object-cover object-center opacity-85 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-100"
                          onError={() => setRefImgError(prev => ({ ...prev, [id]: true }))}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#07080a] via-transparent to-transparent" />
                        
                        {selected && (
                          <span className="absolute top-3 right-3 rounded-full border border-[#ff6363]/40 bg-[#452324] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#ff6363] uppercase">
                            Active Target
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-white tracking-tight">
                          {meta.name}
                        </h3>
                        <p className="text-xs font-mono text-[#9c9c9d] mt-0.5">
                          {meta.sanskrit}
                        </p>

                        {/* Real-time ML matching progress */}
                        {tracking && (
                          <div className="mt-4 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-[#6a6b6c]">ML Match:</span>
                              <span className={`font-bold tabular-nums ${selected ? 'text-[#ff6363]' : 'text-white'}`}>
                                {score}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1b1c1e]">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${selected ? 'bg-[#ff6363]' : 'bg-[#363739]'}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          voiceCoach.cancel()
                          setTargetId(id)
                          setActiveTab('camera')
                        }}
                        className={`mt-6 w-full rounded-lg py-2 text-xs font-semibold transition-all ${
                          selected
                            ? 'bg-[#e6e6e6] text-[#1b1c1e] hover:bg-white key-shadow'
                            : 'border border-[#363739] bg-[#111214] text-white hover:border-[#ff6363]'
                        }`}
                      >
                        {selected ? 'Open in Camera Coach' : 'Select & Practice'}
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>

          </div>
        )}

        {/* ── TAB 5: PROGRESS REPORTS ────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="flex-1 bg-[#040506]">
            <HistoryAndProgress
              sessions={sessions}
              onDeleteSession={handleDeleteSession}
              onClearAll={handleClearAllSessions}
              onInspectSession={(selected) => setActiveSummary(selected)}
              onStartPractice={() => handleStartSession()}
              newestSessionId={newestSessionId}
            />
          </div>
        )}

        {/* ── TAB 6: SETTINGS ────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="flex-1 bg-[#040506] w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            {/* Page Header */}
            <div className="border-b border-[#363739]/60 pb-6">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#ff6363]" />
                <span className="text-xs font-mono uppercase tracking-widest text-[#ff6363]">Studio Preferences</span>
              </div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Voice Guidance &amp; System Settings
              </h2>
              <p className="mt-1 text-sm text-[#9c9c9d]">
                Configure audio coaching cadence, preferred language synthesis, and inspect client-side model diagnostics.
              </p>
            </div>

            {/* Voice Coach Language Options */}
            <div className="rounded-2xl border border-[#363739] bg-[#07080a] p-6 sm:p-8 key-shadow space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Voice Coach Spoken Language</h3>
                <p className="text-xs text-[#9c9c9d] mt-1">
                  Controls synthesized audio cues triggered during settlement, angular corrections, and posture completion.
                </p>
              </div>

              <div className="space-y-3">
                {([
                  { value: 'en',        label: 'English Only',                 sub: 'All verbal instructions synthesized in English',   icon: '🇬🇧' },
                  { value: 'mr',        label: 'मराठी Only',                   sub: 'सर्व मार्गदर्शन मराठी भाषेत दिले जाईल',             icon: '🇮🇳' },
                  { value: 'off',       label: 'Mute / Off',                   sub: 'Disable all audio coaching sound',                  icon: '🔇' },
                ] as { value: VoiceMode; label: string; sub: string; icon: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPendingVoiceMode(opt.value)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                      pendingVoiceMode === opt.value
                        ? 'border-[#ff6363] bg-[#111214] key-shadow'
                        : 'border-[#363739] bg-[#07080a] hover:border-[#454647]'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${pendingVoiceMode === opt.value ? 'text-white' : 'text-stone-300'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-[#9c9c9d]">{opt.sub}</p>
                    </div>
                    {pendingVoiceMode === opt.value && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff6363] text-white">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#363739]/60">
                <button
                  type="button"
                  onClick={() => {
                    setVoiceMode(pendingVoiceMode)
                    if (pendingVoiceMode === 'off') voiceCoach.cancel()
                  }}
                  disabled={pendingVoiceMode === voiceMode}
                  className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold transition-all ${
                    pendingVoiceMode === voiceMode
                      ? 'cursor-default bg-[#1b1c1e] text-[#6a6b6c] border border-[#363739]'
                      : 'bg-[#e6e6e6] text-[#1b1c1e] hover:bg-white key-shadow'
                  }`}
                >
                  {pendingVoiceMode === voiceMode ? '✓ Preference Saved' : 'Save Preference'}
                </button>

                {pendingVoiceMode === voiceMode && (
                  <p className="text-xs font-mono text-emerald-400">
                    Active Language: {voiceMode === 'en' ? 'English' : voiceMode === 'mr' ? 'मराठी' : 'Muted'}
                  </p>
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. SESSION SUMMARY MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {activeSummary && (
        <SessionSummaryModal
          session={activeSummary}
          onClose={() => setActiveSummary(null)}
          onViewHistory={() => {
            setActiveSummary(null)
            setActiveTab('history')
          }}
        />
      )}

    </div>
  )
}
