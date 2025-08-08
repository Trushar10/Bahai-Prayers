// pages/index.tsx

import { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { Entry, EntrySkeletonType, EntryFieldTypes } from 'contentful'
import { client } from '../lib/contentful'
import { useEffect, useState, useRef } from 'react'

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text
  slug: EntryFieldTypes.Text
  body: EntryFieldTypes.RichText
}>
type PrayerEntry = Entry<PrayerSkeleton>

export const getStaticProps: GetStaticProps = async () => {
  const res = await client.getEntries<PrayerSkeleton>({ content_type: 'prayer' })

  return {
    props: {
      prayers: res.items as PrayerEntry[],
    },
  }
}

export default function Home({ prayers }: { prayers: PrayerEntry[] }) {
  const compassRef = useRef<HTMLDivElement>(null)
  const [angle, setAngle] = useState(0)

  // Coordinates of Baháʼu'lláh’s shrine
  const shrineLat = 32.943333
  const shrineLng = 35.092222

  useEffect(() => {
    const updateCompass = async () => {
      if (!navigator.geolocation || typeof window === 'undefined') return

      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords
        const angleToShrine = getBearing(latitude, longitude, shrineLat, shrineLng)
        setAngle(angleToShrine)
      })

      if (window.DeviceOrientationEvent && 'ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', (e) => {
          if (e.alpha != null) {
            compassRef.current?.style.setProperty('--angle', `${angle - e.alpha}deg`)
          }
        })
      }
    }

    updateCompass()
  }, [angle])

  function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (deg: number) => deg * (Math.PI / 180)
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
    const brng = Math.atan2(y, x)
    return (brng * (180 / Math.PI) + 360) % 360
  }

  return (
    <>
      <Head>
        <title>Prayer App</title>
        <meta name="theme-color" content="#317EFB" />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <div className="min-h-screen bg-black text-white flex flex-col items-center pt-20">
        <header className="flex items-center space-x-4 mb-8">
          <h1 className="text-3xl font-bold">Prayers</h1>
          <div
            ref={compassRef}
            className="w-6 h-6 border-t-2 border-r-2 border-white rotate-[var(--angle,0deg)] transition-transform duration-500"
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: '50% 50%',
            }}
            title="Points to Baháʼu'lláh’s Shrine"
          />
        </header>

        <main className="w-full max-w-xl">
          <ul className="space-y-4 text-center">
            {prayers.map((p) => (
              <li key={p.sys.id}>
                <Link
                  href={`/${p.fields.slug}`}
                  className="text-white text-lg hover:underline"
                >
                  {typeof p.fields.title === 'string' ? p.fields.title : 'Untitled'}
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </>
  )
}
