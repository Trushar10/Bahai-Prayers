import { useState, useEffect, useCallback } from 'react'

export default function Compass() {
  const [direction, setDirection] = useState<number | null>(null)

  const updateDirection = useCallback(() => {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (event) => {
        if (event.alpha !== null) {
          setDirection(event.alpha)
        }
      })
    }
  }, [])

  useEffect(() => {
    updateDirection()
  }, [updateDirection])

  return (
    <div className="w-8 h-8 border border-white rounded-full flex items-center justify-center">
      {direction !== null ? `${Math.round(direction)}°` : '—'}
    </div>
  )
}
