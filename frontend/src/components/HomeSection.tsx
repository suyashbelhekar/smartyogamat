import { useState } from 'react'
import { POSE_CLASSES, POSE_META, POSE_IMAGES, type PoseClassId } from '../lib/landmarks'

interface HomeSectionProps {
  onStartSession: (poseId?: PoseClassId) => void
  onNavigateTab: (tab: 'camera' | 'pressure' | 'poses' | 'history' | 'settings') => void
  heroImageSrc?: string
}

const POSE_THUMBS: Record<PoseClassId, string> = POSE_IMAGES

export function HomeSection({
  onStartSession,
  onNavigateTab,
  heroImageSrc = "/images/yogaimage.jpg",
}: HomeSectionProps) {
  const [imageError, setImageError] = useState(false)

  const scrollToFeatures = () => {
    const el = document.getElementById('features-section')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="w-full flex flex-col bg-[#040506] text-white">

      {/* ── 1. ATMOSPHERIC HERO SECTION ─────────────────────────────────── */}
      <section className="relative w-full overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        
        {/* Raycast-style Red & Blue Atmospheric Radial Gradient Wash */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] rounded-full blur-[110px] opacity-40"
          style={{
            background: 'radial-gradient(ellipse at 50% 35%, rgba(4, 63, 150, 0.75) 0%, rgba(20, 60, 163, 0.35) 45%, transparent 75%)',
          }}
        />
        <div
          className="pointer-events-none absolute top-12 left-1/3 -translate-x-1/2 w-[480px] h-[340px] rounded-full blur-[90px] opacity-30 animate-hero-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255, 99, 99, 0.6) 0%, rgba(69, 35, 36, 0.3) 50%, transparent 75%)',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          
          {/* Eyebrow Tag */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#363739] bg-[#07080a]/90 px-3.5 py-1.5 text-[11px] font-mono tracking-[0.08em] text-[#9c9c9d] uppercase backdrop-blur-md key-shadow-subtle">
            <span className="h-2 w-2 rounded-full bg-[#ff6363] shadow-[0_0_8px_#ff6363]" />
            <span>SMARTYOGA AI · REAL-TIME SKELETON TRACKING &amp; SMART MAT</span>
          </div>

          {/* Strong Headline (Inter 400 regular weight at large display size per DESIGN.md) */}
          <h1 className="max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-normal tracking-[0.015em] text-white leading-[1.12]">
            Precision Yoga Coaching. <br />
            <span className="text-[#9c9c9d]">
              Driven by Intelligent Biomechanics.
            </span>
          </h1>

          {/* Short Description */}
          <p className="mt-6 max-w-2xl text-base sm:text-lg text-[#9c9c9d] leading-relaxed font-normal">
            Experience studio-grade posture correction with 33-point 3D skeleton tracking and multi-zone FSR smart mat telemetry. Real-time joint alignment corrections with natural bilingual voice guidance.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {/* Primary Action Button (Mist #e6e6e6 fill with Iron #1b1c1e text per DESIGN.md) */}
            <button
              type="button"
              onClick={() => onStartSession()}
              className="inline-flex items-center gap-2.5 rounded-lg bg-[#e6e6e6] px-6 py-3.5 text-sm font-semibold text-[#1b1c1e] transition-all duration-200 hover:bg-white hover:scale-[1.02] active:scale-[0.98] key-shadow"
            >
              <span>🧘</span>
              <span>Start Yoga Session</span>
            </button>

            {/* Secondary Action Button */}
            <button
              type="button"
              onClick={scrollToFeatures}
              className="inline-flex items-center gap-2 rounded-lg border border-[#363739] bg-transparent px-6 py-3.5 text-sm font-medium text-[#e6e6e6] transition-all duration-200 hover:border-white hover:bg-white/5 active:scale-[0.98]"
            >
              <span>Explore Features</span>
              <span className="text-[#9c9c9d]">↓</span>
            </button>
          </div>

          {/* Technical Metadata Strip (Geist Mono 12px per DESIGN.md) */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-4 font-mono text-[11px] sm:text-xs text-[#6a6b6c]">
            <span>v2.4.0 Studio</span>
            <span>|</span>
            <span>30+ FPS Edge Vision</span>
            <span>|</span>
            <span>Dual FSR Mat Matrix</span>
            <span>|</span>
            <span>EN / मराठी Voice Coach</span>
            <span>|</span>
            <span>100% Private (No Cloud Video)</span>
          </div>

          {/* ── 2. LARGE REPLACEABLE HERO IMAGE AREA ──────────────────────── */}
          <div className="mt-12 sm:mt-16 w-full max-w-6xl animate-hero-reveal">
            <div className="group relative w-full overflow-hidden rounded-2xl border border-[#363739] bg-[#07080a] p-2 sm:p-3 key-shadow transition-all duration-500 hover:border-[#ff6363]/40">
              
              {/* Replaceable Asset Frame */}
              <div className="relative aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9] w-full max-h-[580px] overflow-hidden rounded-xl bg-[#040506]">
                {heroImageSrc && !imageError ? (
                  <div className="relative h-full w-full overflow-hidden">
                    <img
                      src={heroImageSrc}
                      alt="SmartYoga AI Studio Posture Tracking"
                      className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                      loading="eager"
                      onError={() => setImageError(true)}
                    />
                    {/* Atmospheric Dark Gradient Vignette for Depth & Contrast */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07080a] via-black/20 to-[#07080a]/35" />
                    {/* Atmospheric Ambient Glow Accent */}
                    <div className="pointer-events-none absolute top-0 left-1/4 h-32 w-48 rounded-full bg-[#143ca3]/20 blur-[50px]" />
                    <div className="pointer-events-none absolute bottom-0 right-1/4 h-32 w-48 rounded-full bg-[#ff6363]/15 blur-[50px]" />
                  </div>
                ) : (
                  /* ── Generative Visual Cockpit Placeholder ── */
                  <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#07080a] via-[#040506] to-[#0b0c10]">
                    
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(#22242a_1px,transparent_1px)] [background-size:24px_24px] opacity-35" />

                    {/* Central Geometric Atmospheric Glow */}
                    <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-[#143ca3]/30 blur-[70px] animate-hero-glow" />
                    <div className="pointer-events-none absolute h-40 w-40 rounded-full bg-[#ff6363]/25 blur-[50px] animate-hero-glow" />

                    {/* Skeleton Pose Hologram Graphic */}
                    <div className="relative flex flex-col items-center justify-center space-y-4 z-10">
                      
                      {/* Stylized Keypoint Skeleton Silhouette */}
                      <div className="relative h-44 w-44 sm:h-52 sm:w-52 flex items-center justify-center animate-subtle-float">
                        <svg viewBox="0 0 200 200" className="h-full w-full select-none">
                          {/* Bones */}
                          <line x1="100" y1="40" x2="100" y2="75" stroke="#363739" strokeWidth="2.5" />
                          <line x1="100" y1="75" x2="65"  y2="100" stroke="#ff6363" strokeWidth="2.5" />
                          <line x1="65"  y1="100" x2="40" y2="135" stroke="#ff6363" strokeWidth="2" />
                          <line x1="100" y1="75" x2="135" y2="100" stroke="#63a1ff" strokeWidth="2.5" />
                          <line x1="135" y1="100" x2="160" y2="135" stroke="#63a1ff" strokeWidth="2" />
                          
                          <line x1="100" y1="75" x2="100" y2="125" stroke="#59d499" strokeWidth="2.5" />
                          <line x1="100" y1="125" x2="70" y2="175" stroke="#59d499" strokeWidth="2.5" />
                          <line x1="100" y1="125" x2="130" y2="175" stroke="#59d499" strokeWidth="2.5" />

                          {/* Torso Alignment Ring */}
                          <circle cx="100" cy="100" r="45" fill="none" stroke="#363739" strokeWidth="1" strokeDasharray="3 3" />

                          {/* Joint Keypoint Nodes */}
                          <circle cx="100" cy="35" r="8" fill="#ff6363" className="shadow-[0_0_12px_#ff6363]" />
                          <circle cx="100" cy="75" r="4.5" fill="#ffffff" />
                          <circle cx="65" cy="100" r="4" fill="#ff6363" />
                          <circle cx="40" cy="135" r="4" fill="#ff6363" />
                          <circle cx="135" cy="100" r="4" fill="#63a1ff" />
                          <circle cx="160" cy="135" r="4" fill="#63a1ff" />
                          <circle cx="100" cy="125" r="5" fill="#59d499" />
                          <circle cx="70" cy="175" r="4" fill="#59d499" />
                          <circle cx="130" cy="175" r="4" fill="#59d499" />
                        </svg>
                      </div>

                      {/* Replaceable Placeholder Badge */}
                      <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#363739] bg-[#111214]/90 px-3.5 py-1 text-xs font-mono text-[#9c9c9d] backdrop-blur-md">
                          <span className="text-[#ff6363]">✦</span>
                          <span>Replaceable Hero Image Placeholder</span>
                        </div>
                        <p className="text-[11px] font-mono text-[#6a6b6c]">
                          Upload custom asset or replace with actual yoga photography anytime
                        </p>
                      </div>
                    </div>

                  </div>
                )}

                {/* Floating HUD Telemetry Chips around image area */}
                {/* Top-Left Chip */}
                <div className="absolute top-4 left-4 flex items-center gap-2 rounded-xl border border-[#363739]/90 bg-[#111214]/90 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-md key-shadow-subtle select-none">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">33 3D SKELETON JOINTS ACTIVE</span>
                  <span className="sm:hidden">33 3D JOINTS</span>
                </div>

                {/* Top-Right Chip */}
                <div className="absolute top-4 right-4 flex items-center gap-2 rounded-xl border border-[#363739]/90 bg-[#111214]/90 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-md key-shadow-subtle select-none">
                  <span className="text-[#ff6363]">🎯</span>
                  <span className="hidden sm:inline">DOWNWARD DOG · 96% ALIGNMENT</span>
                  <span className="sm:hidden">96% ALIGNMENT</span>
                </div>

                {/* Bottom-Left Chip */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-[#363739]/90 bg-[#111214]/90 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-md key-shadow-subtle select-none">
                  <span>🦶</span>
                  <span className="hidden sm:inline">SMART MAT EQUILIBRIUM: 50/50</span>
                  <span className="sm:hidden">MAT: 50/50</span>
                </div>

                {/* Bottom-Right Chip */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-[#363739]/90 bg-[#111214]/90 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-md key-shadow-subtle select-none">
                  <span>🔊</span>
                  <span className="hidden sm:inline">VOICE: "Keep chest expanded · छाती खुली ठेवा"</span>
                  <span className="sm:hidden">VOICE COACH</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── 3. WIDE FEATURE SHOWCASE GRID ───────────────────────────────── */}
      <section id="features-section" className="w-full border-t border-[#363739]/60 bg-[#040506] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Section Header */}
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-[#ff6363]">Intelligent Architecture</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-white">
              Engineered for absolute posture fidelity.
            </h2>
            <p className="mt-3 text-base text-[#9c9c9d] leading-relaxed">
              Every millimeter of skeletal movement and gram of mat pressure is computed client-side in real time to guide your practice safely.
            </p>
          </div>

          {/* 4 Feature Cards (Raycast Key Shadow, 16px radius, circular icon containers per DESIGN.md) */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Feature 1 */}
            <div
              onClick={() => onNavigateTab('camera')}
              className="group cursor-pointer rounded-2xl border border-[#363739] bg-[#07080a] p-8 key-shadow transition-all duration-300 hover:border-[#ff6363]/50 hover:bg-[#0c0d11]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#363739] bg-[#111214] text-xl text-[#e6e6e6]">
                  📷
                </div>
                <span className="font-mono text-xs text-[#6a6b6c] group-hover:text-[#ff6363] transition-colors">
                  01 / VISION
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white tracking-tight">
                Sub-Millisecond 3D Skeleton Tracking
              </h3>
              <p className="mt-2 text-sm text-[#9c9c9d] leading-relaxed">
                Tracks 33 spatial body landmarks at camera refresh rates. Calculates joint angles for shoulders, hips, knees, and ankles with instant visual feedback and alignment settlement timers.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-white group-hover:text-[#ff6363] transition-colors">
                <span>Launch Live Coach</span>
                <span>→</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div
              onClick={() => onNavigateTab('pressure')}
              className="group cursor-pointer rounded-2xl border border-[#363739] bg-[#07080a] p-8 key-shadow transition-all duration-300 hover:border-[#63a1ff]/50 hover:bg-[#0c0d11]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#363739] bg-[#111214] text-xl text-[#e6e6e6]">
                  🦶
                </div>
                <span className="font-mono text-xs text-[#6a6b6c] group-hover:text-[#63a1ff] transition-colors">
                  02 / TELEMETRY
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white tracking-tight">
                6-Zone IoT Smart Mat Pressure Matrix
              </h3>
              <p className="mt-2 text-sm text-[#9c9c9d] leading-relaxed">
                Connects directly to your ESP32-powered mat via Firebase Realtime Database. Reads forefoot, midfoot, and rearfoot pressure across left and right tracks to ensure perfect weight equilibrium.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-white group-hover:text-[#63a1ff] transition-colors">
                <span>Inspect Pressure Data</span>
                <span>→</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div
              onClick={() => onNavigateTab('settings')}
              className="group cursor-pointer rounded-2xl border border-[#363739] bg-[#07080a] p-8 key-shadow transition-all duration-300 hover:border-[#59d499]/50 hover:bg-[#0c0d11]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#363739] bg-[#111214] text-xl text-[#e6e6e6]">
                  🔊
                </div>
                <span className="font-mono text-xs text-[#6a6b6c] group-hover:text-[#59d499] transition-colors">
                  03 / VOICE
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white tracking-tight">
                Hands-Free Bilingual Voice Coach
              </h3>
              <p className="mt-2 text-sm text-[#9c9c9d] leading-relaxed">
                Practice without craning your neck to see a display. Natural spoken cues in English and मराठी give timely posture reminders, posture confirmations, and settling count-downs.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-white group-hover:text-[#59d499] transition-colors">
                <span>Configure Voice Preferences</span>
                <span>→</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div
              onClick={() => onNavigateTab('history')}
              className="group cursor-pointer rounded-2xl border border-[#363739] bg-[#07080a] p-8 key-shadow transition-all duration-300 hover:border-[#ff6363]/50 hover:bg-[#0c0d11]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#363739] bg-[#111214] text-xl text-[#e6e6e6]">
                  📊
                </div>
                <span className="font-mono text-xs text-[#6a6b6c] group-hover:text-[#ff6363] transition-colors">
                  04 / ANALYTICS
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white tracking-tight">
                Longitudinal Progress &amp; Biomechanical Reports
              </h3>
              <p className="mt-2 text-sm text-[#9c9c9d] leading-relaxed">
                Automatic session journaling calculates joint angle deviations, hold stability ratios, and historical momentum trends with SVG charts and actionable recovery suggestions.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-white group-hover:text-[#ff6363] transition-colors">
                <span>Review History &amp; Trends</span>
                <span>→</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 4. ASANA LIBRARY HORIZONTAL PREVIEW ─────────────────────────── */}
      <section className="w-full border-t border-[#363739]/60 bg-[#07080a] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#ff6363]">Classical Curriculum</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-white">
                Supported Asana Library
              </h2>
              <p className="mt-2 text-sm text-[#9c9c9d]">
                Pre-trained multi-angle computer vision models calibrated for traditional postures.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('poses')}
              className="inline-flex items-center gap-2 rounded-lg border border-[#363739] bg-[#111214] px-4 py-2 text-xs font-semibold text-white hover:border-white transition-colors key-shadow-subtle self-start sm:self-auto"
            >
              <span>View All Asanas</span>
              <span>→</span>
            </button>
          </div>

          {/* Wide Grid of Asanas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {POSE_CLASSES.map((id) => {
              const meta = POSE_META[id]
              const thumb = POSE_THUMBS[id]
              return (
                <div
                  key={id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#363739] bg-[#111214] key-shadow transition-all duration-300 hover:border-[#ff6363]/60 hover:scale-[1.01]"
                >
                  {/* Photo Banner */}
                  <div className="relative h-36 w-full overflow-hidden bg-[#040506]">
                    <img
                      src={thumb}
                      alt={meta.name}
                      className="h-full w-full object-cover object-top opacity-85 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111214] via-transparent to-transparent" />
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-[#ff6363] uppercase tracking-wider">
                          Asana
                        </span>
                        <span className="text-[10px] font-mono text-[#6a6b6c] uppercase">
                          AI Calibrated
                        </span>
                      </div>
                      <h4 className="mt-1 text-lg font-semibold text-white">
                        {meta.name}
                      </h4>
                      <p className="text-xs text-[#9c9c9d] font-mono">
                        {meta.sanskrit}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onStartSession(id)}
                      className="mt-5 w-full rounded-lg border border-[#363739] bg-[#07080a] py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#e6e6e6] hover:text-[#1b1c1e] hover:border-[#e6e6e6] key-shadow-subtle"
                    >
                      Practice {meta.name}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ── 6. FOOTER ───────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-[#363739]/60 bg-[#040506] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#6a6b6c]">
          <div className="flex items-center gap-2">
            <span className="text-[#ff6363]">◆</span>
            <span className="text-white font-medium">SmartYoga AI</span>
            <span>·</span>
            <span>Precision Posture &amp; Mat Intelligence</span>
          </div>
          <div>
            Built with MediaPipe · YOLO · Firebase IoT · React
          </div>
        </div>
      </footer>

    </div>
  )
}
