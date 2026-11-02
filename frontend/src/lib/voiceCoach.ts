export type VoiceMode = 'bilingual' | 'en' | 'mr' | 'off'

// ── Per-pose real-time coaching cues ─────────────────────────────────────────
// Indexed by PoseClassId. Each tier fires at a different confidence band.
// 'low'  = score < 0.45  (body not aligned yet)
// 'mid'  = 0.45 ≤ score < 0.65  (getting close)
// 'high' = score ≥ 0.65  (nearly matched — fine-tune)

export type CueTier = 'low' | 'mid' | 'high'

interface PoseCuePair { en: string; mr: string }
interface PoseCues { low: PoseCuePair[]; mid: PoseCuePair[]; high: PoseCuePair[] }

export const POSE_CUES: Record<string, PoseCues> = {
  downdog: {
    low: [
      { en: 'Start on hands and knees, tuck your toes, and lift your hips high.', mr: 'हात आणि गुडघ्यांवर या, बोटे टेकवून नितंब वर उचला.' },
      { en: 'Form an inverted V-shape with your body, pressing hands into the mat.', mr: 'शरीराचा उलटा व्ही आकार करा आणि हात जमिनीवर दाबा.' },
    ],
    mid: [
      { en: 'Press firmly through your palms, lengthen your spine, and draw heels toward the floor.', mr: 'तळवे जमिनीवर घट्ट दाबा, कणा लांब करा आणि टाचा खाली आणा.' },
      { en: 'Roll your shoulders away from your ears and engage your thighs.', mr: 'खांदे कानांपासून दूर ठेवा आणि मांड्या घट्ट करा.' },
    ],
    high: [
      { en: 'Maintain deep breathing, send hips toward the ceiling, and relax your neck.', mr: 'खोल श्वास सुरू ठेवा, नितंब छताकडे उचला आणि मान सैल ठेवा.' },
      { en: 'Excellent Downward Dog posture — hold steady with calm breath.', mr: 'अधोमुख श्वानासनात उत्तम मुद्रा — शांत श्वास घेत स्थिर रहा.' },
    ],
  },
  goddess: {
    low: [
      { en: 'Step feet wide apart, turn your toes outward forty-five degrees.', mr: 'दोन्ही पाय रुंद पसरवा आणि पायाची बोटे बाहेर वळवा.' },
      { en: 'Bend your knees deeply and sink your hips into a squat.', mr: 'गुडघे वाकवा आणि नितंब खाली घेऊन बसा.' },
    ],
    mid: [
      { en: 'Open your knees outward tracking over your toes, keeping your torso upright.', mr: 'गुडघे बोटांच्या रेषेत बाहेर उघडा आणि शरीर ताठ ठेवा.' },
      { en: 'Bend elbows to ninety degrees at shoulder height with palms facing forward.', mr: 'कोपरे खांद्याच्या रेषेत नव्वद अंशात वाकवून तळवे पुढे ठेवा.' },
    ],
    high: [
      { en: 'Sink deep into the hips, engage your core, and keep your spine tall.', mr: 'नितंब आणखी खाली न्या, पाठीचा कणा सरळ ठेवा.' },
      { en: 'Superb Goddess posture — power through your thighs and hold steady.', mr: 'उत्कृष्ट उत्कट कोणासन — मांड्यांमध्ये ताकद ठेवून स्थिर रहा.' },
    ],
  },
  plank: {
    low: [
      { en: 'Place hands directly under shoulders and extend both legs straight back.', mr: 'हात थेट खांद्याखाली ठेवा आणि पाय मागे सरळ करा.' },
      { en: 'Create a straight line from crown of your head through your heels.', mr: 'डोक्यापासून टाचांपर्यंत शरीर एका सरळ रेषेत आणा.' },
    ],
    mid: [
      { en: 'Engage your core, lift your navel toward your spine, avoid sagging hips.', mr: 'पोट घट्ट करा, नाभी कण्याकडे खेचा आणि कंबर झुकू देऊ नका.' },
      { en: 'Press the floor away with your hands and broaden across your upper back.', mr: 'हातांनी जमीन दाबा आणि खांदे रुंद करा.' },
    ],
    high: [
      { en: 'Keep your neck neutral, gaze slightly ahead of your hands, and breathe.', mr: 'मान सैल ठेवा, हातांच्या थोडे पुढे पहा आणि श्वास चालू ठेवा.' },
      { en: 'Solid Plank hold — maintain full-body tension and breathe evenly.', mr: 'मजबूत फलकासन — पूर्ण शरीरात ताकद ठेवून शांत श्वास घ्या.' },
    ],
  },
  tree: {
    low: [
      { en: 'Stand tall on your standing foot and find a fixed focal point.', mr: 'एका पायावर सरळ उभे रहा आणि दृष्टी एका बिंदूवर स्थिर करा.' },
      { en: 'Place the sole of your opposite foot on your inner calf or thigh.', mr: 'दुसऱ्या पायाचा तळवा मांडीवर किंवा पोटरीवर ठेवा.' },
    ],
    mid: [
      { en: 'Bring your palms together at heart center in Anjali Mudra.', mr: 'दोन्ही तळवे छातीसमोर जोडून नमस्कार मुद्रा करा.' },
      { en: 'Press standing foot firmly into the mat and open your bent knee outward.', mr: 'उभ्या पायाचा तळवा जमिनीवर घट्ट दाबा आणि वाकलेला गुडघा बाहेर उघडा.' },
    ],
    high: [
      { en: 'Extend your arms overhead like branches and lengthen your spine.', mr: 'हात डोक्यावर उंच उचला आणि कणा लांब ठेवा.' },
      { en: 'Wonderful balance in Tree pose — breathe smoothly and hold.', mr: 'वृक्षासनात अप्रतिम तोल — शांत श्वास घेत मुद्रा टिकवा.' },
    ],
  },
  warrior2: {
    low: [
      { en: 'Step feet wide apart, front foot pointing forward and back foot turned in slightly.', mr: 'पाय रुंद करा, पुढचा पाय सरळ आणि मागचा पाय किंचित तिरका ठेवा.' },
      { en: 'Bend your front knee over your ankle and extend arms parallel to the floor.', mr: 'पुढचा गुडघा घोट्यावर नव्वद अंशात वाकवा आणि हात समांतर पसरवा.' },
    ],
    mid: [
      { en: 'Open your hips and torso toward the side while keeping your front knee aligned.', mr: 'नितंब आणि छाती बाजूला उघडा, पुढचा गुडघा घोट्याच्या वर ठेवा.' },
      { en: 'Gaze softly over your front middle fingertip and soften your shoulders.', mr: 'पुढच्या बोटांच्या टोकाकडे पहा आणि खांदे हलके ठेवा.' },
    ],
    high: [
      { en: 'Ground firmly into the outer edge of your back foot and lengthen through fingertips.', mr: 'मागच्या पायाची बाहेरील कडा जमिनीवर घट्ट दाबा आणि हात लांब करा.' },
      { en: 'Strong, grounded Warrior II — stay centered and breathe with confidence.', mr: 'सामर्थ्यवान वीरभद्रासन २ — शांत आणि आत्मविश्वासाने श्वास घ्या.' },
    ],
  },
  ardhamatsyendrasana: {
    low: [
      { en: 'Sit tall with legs extended, bend your knee and cross your foot over the opposite thigh.', mr: 'सरळ बसा, पाय वाकवून विरुद्ध मांडीच्या पलीकडे ठेवा.' },
      { en: 'Bring your elbow outside the bent knee and place opposite hand behind you on the mat.', mr: 'वाकलेल्या गुडघ्याबाहेर कोपर आणा आणि दुसरा हात मागे चटईवर ठेवा.' },
    ],
    mid: [
      { en: 'Inhale to lengthen your spine, exhale to gently rotate through your torso.', mr: 'श्वास घेत कणा सरळ करा, श्वास सोडताना पोटापासून किंचित पिळा.' },
      { en: 'Keep both sitting bones grounded on the floor and gaze softly over your back shoulder.', mr: 'दोन्ही नितंब जमिनीवर टेकवा आणि मागच्या खांद्यावरून हळुवार पहा.' },
    ],
    high: [
      { en: 'Maintain an upright spine without collapsing backward; breathe into the twist.', mr: 'पाठीचा कणा सरळ ताठ ठेवा, मागे झुकू नका आणि शांत श्वास घ्या.' },
      { en: 'Beautiful spinal twist — hold steady and release tension with each breath.', mr: 'सुंदर अर्ध मत्स्येंद्रासन — स्थिर रहा आणि श्वासासह तणाव मुक्त करा.' },
    ],
  },
  baddhakonasana: {
    low: [
      { en: 'Sit upright, bend your knees, and press the soles of your feet together.', mr: 'सरळ बसा, दोन्ही गुडघे वाकवून पायांचे तळवे एकमेकांना जोडा.' },
      { en: 'Hold your feet or ankles with hands and draw heels comfortably toward your pelvis.', mr: 'दोन्ही हातांनी पावले धरा आणि टाचा ओटीपोटाजवळ आणा.' },
    ],
    mid: [
      { en: 'Lengthen your spine, broaden your chest, and let knees drop naturally outward.', mr: 'पाठीचा कणा ताठ करा, छाती उघडा आणि गुडघे जमिनीकडे सैल सोडा.' },
      { en: 'Gently flutter knees or hold steady with relaxed hips and open groin.', mr: 'गुडघे हळुवार हलवा किंवा नितंब सैल ठेवून स्थिर बसा.' },
    ],
    high: [
      { en: 'Roll shoulders back and down, keeping spine tall and hips relaxed.', mr: 'खांदे मागे आणि खाली वळवा, कणा सरळ ठेवा आणि नितंब शिथिल करा.' },
      { en: 'Graceful Bound Angle pose — breathe deeply into your hip flexors.', mr: 'उत्तम बद्ध कोणासन — खोल श्वास घेत मांडी आणि कंबर सैल करा.' },
    ],
  },
  dandasana: {
    low: [
      { en: 'Sit on the mat with both legs extended straight out in front of you.', mr: 'चटईवर दोन्ही पाय समोर सरळ पसरवून बसा.' },
      { en: 'Place your palms flat on the mat beside your hips, fingers pointing forward.', mr: 'दोन्ही हातांचे तळवे नितंबांच्या बाजूला जमिनीवर सपाट ठेवा.' },
    ],
    mid: [
      { en: 'Flex your feet, press thighs down into the mat, and sit tall at ninety degrees.', mr: 'पायाची बोटे स्वतःकडे खेचा, मांड्या जमिनीवर दाबा आणि ९० अंशात सरळ बसा.' },
      { en: 'Engage your core, lift through the crown of your head, and draw shoulders back.', mr: 'पोट घट्ट करा, डोक्याची शेंडी आकाशाकडे ताणा आणि खांदे मागे घ्या.' },
    ],
    high: [
      { en: 'Maintain active straight legs and a proud vertical chest with steady breath.', mr: 'पाय सरळ ताठ ठेवा, छाती पुढच्या बाजूला ताठ ठेवून नियमित श्वास घ्या.' },
      { en: 'Perfect Staff pose alignment — strong, upright, and grounded like a staff.', mr: 'अचूक दंडासन — काठीसारखे ताठ, स्थिर आणि मजबूत बसा.' },
    ],
  },
  padmasana: {
    low: [
      { en: 'Sit with legs extended, bend one knee and place the foot high on the opposite thigh.', mr: 'सरळ बसा, एक गुडघा वाकवून पाऊल विरुद्ध मांडीवर वरच्या बाजूला ठेवा.' },
      { en: 'Carefully fold the second leg, crossing it over and placing the foot onto the first thigh.', mr: 'काळजीपूर्वक दुसरा पाय वाकवून पहिल्या मांडीवर वर ठेवा.' },
    ],
    mid: [
      { en: 'Rest hands on your knees in Jnana mudra with palms facing upward.', mr: 'हात ज्ञानमुद्रेत गुडघ्यांवर ठेवा आणि तळवे छताच्या दिशेने ठेवा.' },
      { en: 'Lengthen your spine from the tailbone to the crown of your head, relaxing shoulders.', mr: 'माकडहाडापासून डोक्यापर्यंत कणा सरळ करा आणि खांदे हलके ठेवा.' },
    ],
    high: [
      { en: 'Close eyes softly or soften your gaze, breathing calm and deep into your belly.', mr: 'डोळे हळुवार मिटा किंवा नजर शांत ठेवा आणि पोटापर्यंत खोल श्वास घ्या.' },
      { en: 'Serene Lotus posture — cultivate inner stillness, balance, and centered breath.', mr: 'शांत आणि स्थिर पद्मासन — अंतर्मनात एकाग्रता साधून शांत श्वास घ्या.' },
    ],
  },
}

// Fallback cues for any pose without a specific entry
export const FALLBACK_CUES: PoseCues = {
  low:  [{ en: 'Step into the pose slowly and find your foundation.', mr: 'हळूहळू आसनात प्रवेश करा आणि पाया स्थिर करा.' }],
  mid:  [{ en: 'Keep your spine long and breathe steadily.', mr: 'कणा लांब ठेवा आणि नियमित श्वास घ्या.' }],
  high: [{ en: 'Fine-tune your alignment and hold with steady breath.', mr: 'मुद्रा अचूक करा आणि शांत श्वासासह धरा.' }],
}

// ── VoiceCoach class ─────────────────────────────────────────────────────────

export interface AccurationParams {
  scorePct: number
  topCueEn?: string
  topCueMr?: string
  jointNameEn?: string
  jointNameMr?: string
  matched: boolean
  poseName: string
  poseId?: string
  mode: VoiceMode
}

class VoiceCoach {
  private lastSpokenText = ''
  private lastSpokenTime = 0
  private isSpeaking = false
  private cooldownMs = 3600
  private repeatCooldownMs = 6500
  private activeSession = false
  private voices: SpeechSynthesisVoice[] = []
  private currentUtterance: SpeechSynthesisUtterance | null = null

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices()
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices()
      }
      const unlock = () => {
        if ('speechSynthesis' in window && window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
        window.removeEventListener('click', unlock)
        window.removeEventListener('keydown', unlock)
        window.removeEventListener('touchstart', unlock)
      }
      window.addEventListener('click', unlock)
      window.addEventListener('keydown', unlock)
      window.addEventListener('touchstart', unlock)
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    this.voices = window.speechSynthesis.getVoices()
  }

  public get speaking(): boolean {
    return this.isSpeaking
  }

  public startSession() {
    this.activeSession = true
    this.lastSpokenText = ''
    this.lastSpokenTime = 0
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }
  }

  public stopSession() {
    this.activeSession = false
    this.cancel()
  }

  private getVoices(): SpeechSynthesisVoice[] {
    if (!this.voices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices()
    }
    return this.voices
  }

  private findVoice(langPrefix: string, fallbackPrefix?: string): SpeechSynthesisVoice | null {
    const voices = this.getVoices()
    if (!voices.length) return null

    // 1. Exact match (e.g. 'en-IN', 'en-US')
    let found = voices.find((v) => v.lang.toLowerCase() === langPrefix.toLowerCase())
    if (found) return found

    // 2. Prefix match (e.g. 'en-')
    found = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()))
    if (found) return found

    // 3. Fallback prefix (e.g. 'hi-IN' or 'hi' for Marathi)
    if (fallbackPrefix) {
      found = voices.find((v) => v.lang.toLowerCase().startsWith(fallbackPrefix.toLowerCase()))
      if (found) return found
    }

    // 4. Primary language tag (e.g. any 'en' voice)
    const baseLang = langPrefix.split('-')[0].toLowerCase()
    found = voices.find((v) => v.lang.toLowerCase().startsWith(baseLang))
    if (found) return found

    // 5. Default browser voice
    found = voices.find((v) => v.default)
    return found || voices[0] || null
  }

  public cancel() {
    this.activeSession = false
    this.isSpeaking = false
    this.lastSpokenText = ''

    if (this.currentUtterance) {
      this.currentUtterance.onend = null
      this.currentUtterance.onerror = null
      this.currentUtterance = null
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
    }
  }

  /**
   * Real-time directional voice instruction delivered while pose is scoring
   * to guide the practitioner toward higher accuracy.
   */
  public speakAccurationInstruction(params: AccurationParams) {
    if (!this.activeSession) return
    const { scorePct, topCueEn, topCueMr, matched, poseName, poseId, mode } = params
    if (mode === 'off' || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (!this.activeSession) return

    const now = performance.now()
    if (now - this.lastSpokenTime < this.cooldownMs) return

    let speechEn = ''
    let speechMr = ''

    // 1. Posture matched or top score tier (>= 85%)
    if (matched || scorePct >= 85) {
      speechEn = 'Great alignment! ' + scorePct + ' percent accuracy. Hold steady.'
      speechMr = 'उत्तम मुद्रा! ' + scorePct + ' टक्के अचूकता. मुद्रा स्थिर ठेवा.'
    }
    // 2. Specific angular deviation fault cue
    else if (topCueEn) {
      const cleanEn = topCueEn.replace(/^[^:]+:\s*/, '').replace(/\s*\(.*?\)\s*/g, '').trim()
      const cleanMr = topCueMr ? topCueMr.replace(/^[^:]+:\s*/, '').replace(/\s*\(.*?\)\s*/g, '').trim() : cleanEn

      if (scorePct >= 65) {
        speechEn = cleanEn + '. Accuracy ' + scorePct + ' percent, almost there.'
        speechMr = cleanMr + '. अचूकता ' + scorePct + ' टक्के, आणखी थोडे सुधारा.'
      } else {
        speechEn = cleanEn + ' to improve accuracy.'
        speechMr = 'अचूकता वाढवण्यासाठी ' + cleanMr + '.'
      }
    }
    // 3. Fallback to curriculum posture cue tier for this pose
    else if (poseId && POSE_CUES[poseId]) {
      const tier: CueTier = scorePct >= 65 ? 'high' : scorePct >= 45 ? 'mid' : 'low'
      const pool = POSE_CUES[poseId][tier]
      if (pool && pool.length > 0) {
        const item = pool[Math.floor(Math.random() * pool.length)]
        speechEn = item.en + ' Current accuracy ' + scorePct + ' percent.'
        speechMr = item.mr + ' चालू अचूकता ' + scorePct + ' टक्के.'
      }
    }

    if (!speechEn) {
      speechEn = 'Adjust your posture to align with ' + poseName + '. Accuracy ' + scorePct + ' percent.'
      speechMr = poseName + ' साठी मुद्रा सुधारा. अचूकता ' + scorePct + ' टक्के.'
    }

    if (this.lastSpokenText === speechEn && now - this.lastSpokenTime < this.repeatCooldownMs) return

    this.cancel()
    this.activeSession = true
    this.lastSpokenText = speechEn
    this.lastSpokenTime = now
    this.isSpeaking     = true

    if (mode === 'mr') {
      this.speakUtterance(speechMr, 'mr-IN', 0.90, () => { this.isSpeaking = false }, 'hi-IN')
    } else {
      this.speakUtterance(speechEn, 'en-IN', 0.95, () => { this.isSpeaking = false }, 'en-US')
    }
  }

  /**
   * Real-time directional posture correction cue:
   * Speaks only the specific adjustment needed to correct the active pose mistake.
   */
  public speakCorrection(enText: string, mrText: string, mode: VoiceMode) {
    if (!this.activeSession || mode === 'off' || !enText || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const now = performance.now()
    if (now - this.lastSpokenTime < this.cooldownMs) return

    const cleanEn = enText.replace(/^[^:]+:\s*/, '').replace(/\s*\(.*?\)\s*/g, '').trim()
    const cleanMr = mrText ? mrText.replace(/^[^:]+:\s*/, '').replace(/\s*\(.*?\)\s*/g, '').trim() : cleanEn

    if (this.lastSpokenText === cleanEn && now - this.lastSpokenTime < this.repeatCooldownMs) return

    this.cancel()
    this.activeSession = true
    this.lastSpokenText = cleanEn
    this.lastSpokenTime = now
    this.isSpeaking     = true

    if (mode === 'mr') {
      this.speakUtterance(cleanMr, 'mr-IN', 0.90, () => { this.isSpeaking = false }, 'hi-IN')
    } else {
      this.speakUtterance(cleanEn, 'en-IN', 0.95, () => { this.isSpeaking = false }, 'en-US')
    }
  }

  /**
   * Confirmation spoken when posture meets target criteria.
   */
  public speakPoseMatch(name: string, sanskrit: string, mode: VoiceMode, scorePct: number = 88) {
    if (!this.activeSession || mode === 'off' || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const now = performance.now()
    if (this.lastSpokenText === 'match_' + name && now - this.lastSpokenTime < 10000) return

    this.cancel()
    this.activeSession = true
    this.lastSpokenTime = now
    this.lastSpokenText = 'match_' + name
    this.isSpeaking     = true

    const enText = 'Superb form! ' + name + ' achieved with ' + scorePct + ' percent accuracy. Hold steady!'
    const mrText = 'उत्तम मुद्रा! ' + sanskrit + ' ' + scorePct + ' टक्के अचूकतेसह साध्य झाली. मुद्रा स्थिर ठेवा!'

    if (mode === 'mr') {
      this.speakUtterance(mrText, 'mr-IN', 0.90, () => { this.isSpeaking = false }, 'hi-IN')
    } else {
      this.speakUtterance(enText, 'en-IN', 0.95, () => { this.isSpeaking = false }, 'en-US')
    }
  }

  public speakPoseCue(_poseId: string, _score: number, _mode: VoiceMode) {}

  public speakPoseIntro(_name: string, _sanskrit: string, _mode: VoiceMode) {}

  private speakUtterance(
    text: string,
    lang: string,
    rate: number,
    onEnd?: () => void,
    fallbackLang?: string,
  ) {
    if (!this.activeSession || !text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeaking = false
      onEnd?.()
      return
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }
    } catch {
      // ignore
    }

    const utterance   = new SpeechSynthesisUtterance(text)
    utterance.rate    = rate
    utterance.pitch   = 1.0

    const voice = this.findVoice(lang, fallbackLang)
    if (voice) {
      utterance.voice = voice
    } else {
      utterance.lang  = lang
    }

    this.currentUtterance = utterance

    utterance.onend = () => {
      this.currentUtterance = null
      this.isSpeaking = false
      onEnd?.()
    }
    utterance.onerror = () => {
      this.currentUtterance = null
      this.isSpeaking = false
      onEnd?.()
    }

    if (!this.activeSession) {
      this.currentUtterance = null
      this.isSpeaking = false
      onEnd?.()
      return
    }

    try {
      window.speechSynthesis.speak(utterance)
    } catch {
      this.currentUtterance = null
      this.isSpeaking = false
      onEnd?.()
    }
  }
}

export const voiceCoach = new VoiceCoach()
