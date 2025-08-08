// components/Compass.tsx
'use client'

import { useEffect, useState } from 'react'

const shrineCoords = { lat: 32.9433, lon: 35.0922 } // Baha'u'llah Shrine

export default function Compass() {
  const [angle, setAngle] = useState<number | null>(null)

  // Convert degrees <-> radians
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  const toRad = (deg: number) => (deg * Math.PI) / 180

  // Calculate the bearing from user to shrine (shortest path)
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const φ1 = toRad(lat1)
    const φ2 = toRad(lat2)
    const Δλ = toRad(lon2 - lon1)

    const y = Math.sin(Δλ) * Math.cos(φ2)
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)

    const θ = Math.atan2(y, x)
    return (toDeg(θ) + 360) % 360
  }

  const updateDirection = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          const bearing = calculateBearing(latitude, longitude, shrineCoords.lat, shrineCoords.lon)
          setAngle(bearing)
        },
        (err) => {
          console.error("Geolocation error:", err)
          alert("Failed to get location.")
        },
        { enableHighAccuracy: true }
      )
    } else {
      alert("Geolocation not supported.")
    }
  }

  // Get bearing on initial load
  useEffect(() => {
    updateDirection()
  }, [])

  return (
    <button onClick={updateDirection} title="Tap to refresh direction">
      <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center">
        <div
          className="text-xl transition-transform duration-300"
          style={{
            transform: angle !== null ? `rotate(${angle}deg)` : 'none',
          }}
        >
          ↑
        </div>
      </div>
    </button>
  )
}
