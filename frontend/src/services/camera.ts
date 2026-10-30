export type CameraIssue =
  | 'camera-denied'
  | 'camera-missing'
  | 'camera-in-use'
  | 'camera-error'

export function cameraIssueFromError(error: unknown): CameraIssue {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'camera-denied'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'camera-missing'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'camera-in-use'
  }
  return 'camera-error'
}

export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  })
  video.srcObject = stream
  await video.play()
  return stream
}

export function stopCamera(stream: MediaStream | null, video?: HTMLVideoElement | null) {
  stream?.getTracks().forEach((track) => track.stop())
  if (video) video.srcObject = null
}
