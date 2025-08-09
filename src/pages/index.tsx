import Head from 'next/head'
import { GetStaticProps } from 'next'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { Entry, EntryFieldTypes, EntrySkeletonType, EntrySys } from 'contentful'
import { Document } from '@contentful/rich-text-types'
import { client } from '../lib/contentful'
import ThemeToggle from '../components/ThemeToggle'

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text
  slug: EntryFieldTypes.Text
  body: EntryFieldTypes.RichText
}>

type PrayerEntry = Entry<PrayerSkeleton>

interface GroupedPrayers {
  [tagName: string]: PrayerEntry[]
}

type PrayerCacheEntry = {
  title: string;
  body: string | Document | Record<string, unknown>;
  slug: string;
  sys: EntrySys;
  metadata?: Record<string, unknown>;
};

export const getStaticProps: GetStaticProps = async () => {
  const res = await client.getEntries<PrayerSkeleton>({
    content_type: 'prayer-eng',
    include: 1,
  })

  return {
    props: {
      prayers: res.items as PrayerEntry[],
    },
    revalidate: 60,
  }
}

export default function Home({ prayers }: { prayers: PrayerEntry[] }) {
  const router = useRouter()

  const handleClick = (slug: string) => {
    router.push(`/${slug}`)
  }

  useEffect(() => {
    if ('serviceWorker' in navigator && window.caches && prayers?.length) {
      const cacheData = async () => {
        try {
          const prayersData: Record<string, PrayerCacheEntry> = prayers.reduce((acc, prayer) => {
            if (typeof prayer.fields.slug === 'string') {
              acc[prayer.fields.slug] = {
                title: typeof prayer.fields.title === 'string'
                  ? prayer.fields.title
                  : 'Untitled',
                body: prayer.fields.body,
                slug: prayer.fields.slug,
                sys: prayer.sys,
                metadata: prayer.metadata
              };
            }
            return acc;
          }, {} as Record<string, PrayerCacheEntry>);

          await storePrayersOffline(prayersData)

          navigator.serviceWorker.ready.then((registration) => {
            const slugs = prayers
              .map((p) => (typeof p.fields.slug === 'string' ? `/${p.fields.slug}` : null))
              .filter((slug): slug is string => !!slug)

            registration.active?.postMessage({
              type: 'PRECACHE_PAGES',
              payload: slugs,
            })

            registration.active?.postMessage({
              type: 'CACHE_PRAYERS_DATA',
              payload: prayersData,
            })
          })

          console.log(`✅ Cached ${prayers.length} prayers for offline use`)
        } catch (error) {
          console.error('❌ Failed to cache prayers:', error)
        }
      }

      const timeoutId = setTimeout(cacheData, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [prayers])

  const groupedPrayers: GroupedPrayers = prayers.reduce((acc, prayer) => {
    const tags = prayer.metadata?.tags || []

    if (tags.length === 0) {
      if (!acc['Other']) acc['Other'] = []
      acc['Other'].push(prayer)
    } else {
      tags.forEach((tag) => {
        const tagName = tag.sys?.id || 'Other'

        let displayName = tagName
        if (tagName === 'theObligatoryPrayers') displayName = 'The Obligatory Prayers'
        if (tagName === 'generalPrayers') displayName = 'General Prayers'

        if (!acc[displayName]) acc[displayName] = []
        acc[displayName].push(prayer)
      })
    }
    return acc
  }, {} as GroupedPrayers)

  Object.keys(groupedPrayers).forEach((tag) => {
    groupedPrayers[tag].sort((a, b) => {
      const titleA = typeof a.fields.title === 'string' ? a.fields.title : 'Untitled'
      const titleB = typeof b.fields.title === 'string' ? b.fields.title : 'Untitled'
      return titleA.localeCompare(titleB)
    })
  })

  const sectionOrder = ['The Obligatory Prayers', 'General Prayers', 'Other']
  const orderedSections = sectionOrder.filter((section) => groupedPrayers[section]?.length > 0)

  return (
    <>
      <Head>
        <title>Prayers</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/profile-circle.webp" />
        <meta name="theme-color" content="#317EFB" />
      </Head>

      <div className="container">
        <header className="header">
          <div className="header-content">
            <div className="title">Prayers</div>
            <ThemeToggle />
          </div>
        </header>

        <main className="homepage">
          {orderedSections.map((sectionName) => (
            <section key={sectionName} className="prayer-section">
              <h2 className="section-title">{sectionName}</h2>
              <div className="post-list">
                {groupedPrayers[sectionName].map((p) => (
                  <div
                    key={p.sys.id}
                    className="post-item"
                    onClick={() => {
                      if (typeof p.fields.slug === 'string') {
                        handleClick(p.fields.slug)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && typeof p.fields.slug === 'string') {
                        handleClick(p.fields.slug)
                      }
                    }}
                  >
                    <h3>{typeof p.fields.title === 'string' ? p.fields.title : 'Untitled'}</h3>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </>
  )
}

async function storePrayersOffline(prayersData: Record<string, PrayerCacheEntry>) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('PrayersDB', 1)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['prayers'], 'readwrite')
      const store = transaction.objectStore('prayers')

      store.clear()

      Object.entries(prayersData).forEach(([slug, prayerData]) => {
        store.put({ ...prayerData, id: slug })
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('prayers')) {
        db.createObjectStore('prayers', { keyPath: 'id' })
      }
    }
  })
}
