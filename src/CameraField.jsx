import { useEffect, useRef, useState } from 'react'

function shrink(dataUrl, maxSize = 1100, quality = 0.72) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export default function CameraField({ photo, onChange }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [live, setLive] = useState(false)
  const [err, setErr] = useState('')

  function stop() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setLive(false)
  }

  useEffect(() => stop, [])

  useEffect(() => {
    if (live && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [live])

  async function start() {
    setErr('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr('المتصفح ما بيسمح بالكاميرا. لازم تفتح الصفحة على https أو على localhost.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
      })
      streamRef.current = stream
      setLive(true)
    } catch (e) {
      setErr(
        'ما قدرت أفتح الكاميرا (' +
          (e?.name || 'Fehler') +
          '). جرّب صفحة https، أو ارفع صورة من الألبوم.',
      )
    }
  }

  function shoot() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const maxSide = 1100
    const scale = Math.min(1, maxSide / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * scale)
    c.height = Math.round(v.videoHeight * scale)
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    onChange(c.toDataURL('image/jpeg', 0.72))
    stop()
  }

  async function pick(ev) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const small = await shrink(String(reader.result))
      onChange(small)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="camera">
      {photo && !live ? (
        <div className="shot">
          <img src={photo} alt="صورة الغرفة" />
          <div className="shot-actions">
            <button type="button" className="btn ghost" onClick={start}>
              إعادة التصوير
            </button>
            <button type="button" className="btn ghost danger" onClick={() => onChange('')}>
              حذف
            </button>
          </div>
        </div>
      ) : live ? (
        <div className="viewfinder">
          <video ref={videoRef} playsInline muted autoPlay />
          <div className="vf-actions">
            <button type="button" className="shutter" onClick={shoot} aria-label="تصوير" />
            <button type="button" className="btn ghost" onClick={stop}>
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <div className="cam-empty">
          <button type="button" className="btn primary wide" onClick={start}>
            📷 افتح الكاميرا وشوف الغرفة
          </button>
          <label className="btn ghost wide">
            رفع صورة من الألبوم
            <input type="file" accept="image/*" onChange={pick} hidden />
          </label>
        </div>
      )}
      {err && <p className="hint warn">{err}</p>}
    </div>
  )
}
