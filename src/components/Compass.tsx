'use client'

import { useEffect } from 'react'

const targetLat = 32.943333; // 32°56'36.0"N
const targetLng = 35.092222; // 35°05'32.0"E

export default function Compass() {
  useEffect(() => {
    const updateCompass = () => {
      if (!navigator.geolocation) return

      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords
        const angle = calculateBearing(latitude, longitude, targetLat, targetLng)
        document.documentElement.style.setProperty('--angle', `${angle}deg`)
      })
    }

    updateCompass()
    const interval = setInterval(updateCompass, 10000) // update every 10s

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="ml-4 w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
      <div id="compass" className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-white" />
    </div>
  )
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI

  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lon2 - lon1)

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)

  const θ = Math.atan2(y, x)
  return (toDeg(θ) + 360) % 360
}
