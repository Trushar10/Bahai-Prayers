'use client'

import { useEffect, useRef, useState } from 'react'

// Baháʼu'lláh Shrine coordinates
const SHRINE_LAT = 32.9433
const SHRINE_LNG = 35.0922

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = degToRad(lat1)
  const φ2 = degToRad(lat2)
  const Δλ = degToRad(lon2 - lon1)

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return (θ * 180) / Math.PI
}

export default function Compass() {
  const arrowRef = useRef<HTMLDivElement>(null)
  const [bearing, setBearing] = useState(0)

  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords
      const b = calculateBearing(latitude, longitude, SHRINE_LAT, SHRINE_LNG)
      setBearing(b)
    })
  }, [])

  return (
    <div
      className="w-8 h-8 rounded-full border border-white flex items-center justify-center"
      style={{ transform: `rotate(${bearing}deg)` }}
      title="Points to Baháʼu'lláh Shrine"
    >
      <div ref={arrowRef} className="text-white text-sm">
        ↑
      </div>
    </div>
  )
}
