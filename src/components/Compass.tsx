'use client'

import { useEffect, useRef, useState } from 'react'

const SHRINE_LAT = 32.9433
const SHRINE_LNG = 35.0922

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function radToDeg(rad: number) {
  return (rad * 180) / Math.PI
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = degToRad(lat1)
  const φ2 = degToRad(lat2)
  const Δλ = degToRad(lon2 - lon1)

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return (radToDeg(θ) + 360) % 360
}

export default function Compass() {
  const [angle, setAngle] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const updateDirection = () => {
    setLoading(true)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude
        const userLng = pos.coords.longitude

        const bearing = calculateBearing(userLat, userLng, SHRINE_LAT, SHRINE_LNG)
        setAngle(bearing)
        setLoading(false)
      },
      (err) => {
        console.error('Geolocation error:', err)
        setLoading(false)
      },
      { enableHighAccuracy: true }
    )
  }

  // Optional: fetch once on page load
  useEffect(() => {
    updateDirection()
  }, [])

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={updateDirection}
        className="w-8 h-8 rounded-full border border-white flex items-center justify-center text-white text-sm"
        style={{ transform: angle !== null ? `rotate(${angle}deg)` : 'none' }}
        title="Click to refresh direction"
      >
        ↑
      </button>
      {loading && <span className="text-white text-xs">Locating...</span>}
    </div>
  )
}
