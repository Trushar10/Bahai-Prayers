'use client'

import { useEffect, useRef, useState } from 'react'

// Shrine coordinates
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
  const [angle, setAngle] = useState(0)
  const shrineBearingRef = useRef<number | null>(null)

  useEffect(() => {
    let currentLat = 0
    let currentLng = 0

    // Get user's current location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentLat = pos.coords.latitude
        currentLng = pos.coords.longitude

        // Calculate shrine bearing
        const bearing = calculateBearing(currentLat, currentLng, SHRINE_LAT, SHRINE_LNG)
        shrineBearingRef.current = bearing
      },
      (err) => {
        console.error('Geolocation error:', err)
      },
      { enableHighAccuracy: true }
    )

    // Listen to device orientation
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const heading = event.alpha // degrees from North (0°)
      if (heading !== null && shrineBearingRef.current !== null) {
        const relativeAngle = (shrineBearingRef.current - heading + 360) % 360
        setAngle(relativeAngle)
      }
    }

    window.addEventListener('deviceorientationabsolute', handleOrientation, true)
    window.addEventListener('deviceorientation', handleOrientation, true)

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  return (
    <div
      className="w-8 h-8 rounded-full border border-white flex items-center justify-center"
      style={{ transform: `rotate(${angle}deg)` }}
      title="Points to Baháʼu'lláh Shrine"
    >
      <div className="text-white text-sm">↑</div>
    </div>
  )
}
