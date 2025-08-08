// components/Compass.tsx
'use client'

import { useEffect, useState } from 'react'

const shrineCoords = { lat: 32.9433, lon: 35.0922 } // Target direction

export default function Compass() {
  const [angle, setAngle] = useState<number | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)

  // Convert radians to degrees
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  const toRad = (deg: number) => (deg * Math.PI) / 180

  // Calculate bearing from user to shrine
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

  // Rotate arrow to show direction to shrine
  const updateDirection = (lat: number, lon: number, deviceHeading: number | null) => {
    const bearing = calculateBearing(lat, lon, shrineCoords.lat, shrineCoords.lon)
    if (deviceHeading !== null) {
      const relativeAngle = (bearing - deviceHeading + 360) % 360
      setAngle(relativeAngle)
    } else {
      setAngle(bearing)
    }
  }

  // On mount: get location + orientation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          setCoords({ lat: latitude, lon: longitude })
          updateDirection(latitude, longitude, heading)
        },
        (err) => console.error('Geolocation error:', err),
        { enableHighAccuracy: true }
      )
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const alpha = event.alpha // 0–360
      if (typeof alpha === 'number') {
        const deviceHeading = 360 - alpha // Convert to compass heading
        setHeading(deviceHeading)
        if (coords) updateDirection(coords.lat, coords.lon, deviceHeading)
      }
    }

    window.addEventListener('deviceorientation', handleOrientation, true)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [coords])

  // On click: update based on latest position + heading
  const handleClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          setCoords({ lat, lon })
          updateDirection(lat, lon, heading)
        },
        (err) => {
          console.error("Geolocation error:", err)
          alert("Failed to get location.")
        }
      )
    } else {
      alert("Geolocation not supported.")
    }
  }

  return (
    <button onClick={handleClick} title="Tap to update direction">
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
