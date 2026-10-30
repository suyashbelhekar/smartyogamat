with open('frontend/src/components/HomeSection.tsx', 'r', encoding='utf-8') as f:
    hs = f.read()

# 1. Update default prop
hs = hs.replace(
    'export function HomeSection({\n  onStartSession,\n  onNavigateTab,\n  heroImageSrc,\n}: HomeSectionProps) {',
    "export function HomeSection({\n  onStartSession,\n  onNavigateTab,\n  heroImageSrc = '/images/yogaimage.jpg',\n}: HomeSectionProps) {"
)

# 2. Update the Hero Image container so that yogaimage.jpg displays with proper resolution and HUD telemetry overlay
old_hero_block = """              {/* Replaceable Asset Frame */}
              <div className="relative aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden rounded-xl bg-[#040506]">
                {heroImageSrc && !imageError ? (
                  <img
                    src={heroImageSrc}
                    alt="SmartYoga AI Cockpit"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    onError={() => setImageError(true)}
                  />
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

                    {/* Floating HUD Telemetry Chips around image area */}
                    {/* Top-Left Chip */}
                    <div className="absolute top-4 left-4 hidden sm:flex items-center gap-2 rounded-xl border border-[#363739]/80 bg-[#111214]/90 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-md key-shadow-subtle">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>33 3D SKELETON JOINTS ACTIVE</span>
                    </div>

                    {/* Top-Right Chip */}
                    <div className="absolute top-4 right-4 hidden sm:flex items-center gap-2 rounded-xl border border-[#363739]/80 bg-[#111214]/90 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-md key-shadow-subtle">
                      <span className="text-[#ff6363]">🎯</span>
                      <span>DOWNWARD DOG · 96% ALIGNMENT</span>
                    </div>

                    {/* Bottom-Left Chip */}
                    <div className="absolute bottom-4 left-4 hidden sm:flex items-center gap-2 rounded-xl border border-[#363739]/80 bg-[#111214]/90 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-md key-shadow-subtle">
                      <span>🦶</span>
                      <span>SMART MAT EQUILIBRIUM: 50/50</span>
                    </div>

                    {/* Bottom-Right Chip */}
                    <div className="absolute bottom-4 right-4 hidden sm:flex items-center gap-2 rounded-xl border border-[#363739]/80 bg-[#111214]/90 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-md key-shadow-subtle">
                      <span>🔊</span>
                      <span>VOICE: "Keep chest expanded · छाती खुली ठेवा"</span>
                    </div>

                  </div>
                )}
              </div>"""

new_hero_block = """              {/* Replaceable Asset Frame with Proper Resolution & HUD Overlay */}
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
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07080a] via-black/25 to-[#07080a]/40" />
                    {/* Atmospheric Ambient Glow Accent */}
                    <div className="pointer-events-none absolute top-0 left-1/4 h-32 w-48 rounded-full bg-[#143ca3]/20 blur-[50px]" />
                    <div className="pointer-events-none absolute bottom-0 right-1/4 h-32 w-48 rounded-full bg-[#ff6363]/15 blur-[50px]" />
                  </div>
                ) : (
                  /* ── Generative Visual Cockpit Placeholder Fallback ── */
                  <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#07080a] via-[#040506] to-[#0b0c10]">
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(#22242a_1px,transparent_1px)] [background-size:24px_24px] opacity-35" />

                    {/* Central Atmospheric Glow */}
                    <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-[#143ca3]/30 blur-[70px] animate-hero-glow" />
                    <div className="pointer-events-none absolute h-40 w-40 rounded-full bg-[#ff6363]/25 blur-[50px] animate-hero-glow" />

                    {/* Skeleton Pose Hologram Graphic */}
                    <div className="relative flex flex-col items-center justify-center space-y-4 z-10">
                      <div className="relative h-44 w-44 sm:h-52 sm:w-52 flex items-center justify-center animate-subtle-float">
                        <svg viewBox="0 0 200 200" className="h-full w-full select-none">
                          <line x1="100" y1="40" x2="100" y2="75" stroke="#363739" strokeWidth="2.5" />
                          <line x1="100" y1="75" x2="65"  y2="100" stroke="#ff6363" strokeWidth="2.5" />
                          <line x1="65"  y1="100" x2="40" y2="135" stroke="#ff6363" strokeWidth="2" />
                          <line x1="100" y1="75" x2="135" y2="100" stroke="#63a1ff" strokeWidth="2.5" />
                          <line x1="135" y1="100" x2="160" y2="135" stroke="#63a1ff" strokeWidth="2" />
                          <line x1="100" y1="75" x2="100" y2="125" stroke="#59d499" strokeWidth="2.5" />
                          <line x1="100" y1="125" x2="70" y2="175" stroke="#59d499" strokeWidth="2.5" />
                          <line x1="100" y1="125" x2="130" y2="175" stroke="#59d499" strokeWidth="2.5" />
                          <circle cx="100" cy="100" r="45" fill="none" stroke="#363739" strokeWidth="1" strokeDasharray="3 3" />
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
              </div>"""

def norm(s):
    return s.replace('\r\n', '\n')

hs_norm = norm(hs)
assert norm(old_hero_block) in hs_norm, 'old_hero_block not found in HomeSection.tsx'
hs_norm = hs_norm.replace(norm(old_hero_block), norm(new_hero_block), 1)

with open('frontend/src/components/HomeSection.tsx', 'w', encoding='utf-8') as f:
    f.write(hs_norm)

print("HomeSection.tsx updated successfully!")

# Also ensure App.tsx passes heroImageSrc="/images/yogaimage.jpg"
with open('frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

app = app.replace(
    '<HomeSection\n            onStartSession={(id) => handleStartSession(id)}\n            onNavigateTab={(tab) => setActiveTab(tab)}\n          />',
    '<HomeSection\n            onStartSession={(id) => handleStartSession(id)}\n            onNavigateTab={(tab) => setActiveTab(tab)}\n            heroImageSrc="/images/yogaimage.jpg"\n          />'
).replace(
    '<HomeSection\r\n            onStartSession={(id) => handleStartSession(id)}\r\n            onNavigateTab={(tab) => setActiveTab(tab)}\r\n          />',
    '<HomeSection\r\n            onStartSession={(id) => handleStartSession(id)}\r\n            onNavigateTab={(tab) => setActiveTab(tab)}\r\n            heroImageSrc="/images/yogaimage.jpg"\r\n          />'
)

with open('frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print("App.tsx updated successfully!")
