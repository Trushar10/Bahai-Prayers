import Head from 'next/head'
import { GetStaticProps } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Entry, EntryFieldTypes, EntrySkeletonType, EntrySys } from 'contentful'
import { Document } from '@contentful/rich-text-types'
import { client } from '../lib/contentful'
import ThemeToggle from '../components/ThemeToggle'
import LanguageToggle from '../components/LanguageToggle'

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text
  slug: EntryFieldTypes.Text
  body: EntryFieldTypes.RichText
}>

type PrayerEntry = Entry<PrayerSkeleton>

interface GroupedPrayers {
  [tagName: string]: PrayerEntry[]
}

// type PrayerCacheEntry = {
//   title: string;
//   body: string | Document | Record<string, unknown>;
//   slug: string;
//   sys: EntrySys;
//   metadata?: Record<string, unknown>;
// };

interface Props {
  prayers: PrayerEntry[];
  languages: { code: string; name: string }[];
  defaultLang: string;
}

export const getStaticProps: GetStaticProps = async () => {
  // Fetch all languages dynamically from Contentful content types
  const contentTypes = await client.getContentTypes();
  const languages = contentTypes.items
    .filter((ct) => ct.sys.id.startsWith('prayer-'))
    .map((ct) => {
      const code = ct.sys.id.split('-')[1];
      return {
        code,
        name:
          code === 'en'
            ? 'English'
            : code === 'hi'
            ? 'हिन्दी'
            : code === 'gu'
            ? 'ગુજરાતી'
            : code.toUpperCase(),
      };
    })
    .sort((a, b) => {
      // Sort so English comes first, then others alphabetically
      if (a.code === 'en') return -1;
      if (b.code === 'en') return 1;
      return a.name.localeCompare(b.name);
    });

  // Always default to English
  const defaultLang = 'en';

  // Fetch prayers for default language
  const res = await client.getEntries<PrayerSkeleton>({
    content_type: `prayer-${defaultLang}`,
    include: 1,
  });
  // Sort prayers by title after fetching
  res.items.sort((a, b) => {
    const titleA = typeof a.fields.title === 'string' ? a.fields.title : '';
    const titleB = typeof b.fields.title === 'string' ? b.fields.title : '';
    return titleA.localeCompare(titleB);
  });

  return {
    props: {
      prayers: res.items as PrayerEntry[],
      languages,
      defaultLang,
    },
    revalidate: 60,
  }
}

export default function Home({ prayers, languages, defaultLang }: Props) {
  // State to hold tag ID to name mapping
  const [tagNames, setTagNames] = useState<{ [id: string]: string }>({})
  // Get language from localStorage or default to English
  const getInitialLang = () => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('selectedLang')
      if (savedLang && languages.some(l => l.code === savedLang)) {
        return savedLang
      }
    }
    // Always prefer English first
    return 'en'
  }
  const [selectedLang, setSelectedLang] = useState(getInitialLang())
  const [filteredPrayers, setFilteredPrayers] = useState<Array<PrayerEntry>>(prayers || [])

  // Fetch tag names from Contentful
  // Fetch prayers and tag names together
  useEffect(() => {
    async function fetchPrayersAndTags() {
      const res = await fetch(`/api/prayers?lang=${selectedLang}`)
      const data = await res.json()
      console.log('API response:', data)
      // Set prayers
      setFilteredPrayers(Array.isArray(data.items) ? data.items : (data.items ?? []))
      // Build tag name mapping from API response
      const mapping: { [id: string]: string } = {}
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach((tag: { sys: { id: string }, name?: string }) => {
          mapping[tag.sys.id] = tag.name || tag.sys.id
        })
      }
      console.log('Tag name mapping:', mapping)
      // Log tag IDs used in prayers
      const prayerTagIds = (Array.isArray(data.items) ? data.items : (data.items ?? [])).flatMap((prayer: unknown) => {
        if (typeof prayer === 'object' && prayer && 'metadata' in prayer) {
          const tags = (prayer as { metadata?: { tags?: unknown[] } }).metadata?.tags || [];
          return tags.map((tag: unknown) => {
            if (typeof tag === 'object' && tag && 'sys' in tag) {
              return (tag as { sys?: { id?: string } }).sys?.id;
            }
            return undefined;
          });
        }
        return [];
      })
      console.log('Prayer tag IDs:', prayerTagIds)
      setTagNames(mapping)
    }
    fetchPrayersAndTags()
  }, [selectedLang])
  const router = useRouter()
  // ...existing code...

  // Persist selected language to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLang', selectedLang)
    }
  }, [selectedLang])



  const handleClick = (slug: string) => {
    router.push(`/${selectedLang}/${slug}`)
  }

  // Group prayers by tags (unchanged)
  const groupedPrayers: GroupedPrayers = filteredPrayers.reduce((acc, prayer) => {
    const tags = prayer.metadata?.tags || []
    if (tags.length === 0) {
      if (!acc['Other']) acc['Other'] = []
      acc['Other'].push(prayer)
    } else {
      tags.forEach((tag) => {
        const tagId = tag.sys?.id || 'Other'
        const displayName = tagNames[tagId] || tagId || 'Other'
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

  // Get all tag names and sort them alphabetically
  // Custom order: The Obligatory Prayers, General Prayers, then others alphabetically, then Other
  const obligatory = Object.keys(groupedPrayers).find(
    name => name.toLowerCase().includes('obligatory')
  )
  const general = Object.keys(groupedPrayers).find(
    name => name.toLowerCase().includes('general')
  )
  const other = Object.keys(groupedPrayers).find(
    name => name.toLowerCase() === 'other'
  )
  // All other tags except the above
  const rest = Object.keys(groupedPrayers)
    .filter(
      name => name !== obligatory && name !== general && name !== other
    )
    .sort((a, b) => a.localeCompare(b))
  const orderedSections = [
    obligatory,
    general,
    ...rest,
    other
  ].filter((name): name is string => typeof name === 'string' && Boolean(name))

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
            <LanguageToggle
              languages={languages}
              currentLang={selectedLang}
              onChange={setSelectedLang}
            />           
          </div>
        </header>

        <main className="homepage">
          {orderedSections.map((sectionName) => (
            <section key={sectionName} className="prayer-section">
              <h2 className="section-title">{sectionName}</h2>
              <div className="post-list">
                {groupedPrayers[sectionName].map((p: PrayerEntry) => (
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
        <footer className="footer">
          <p>&copy; {new Date().getFullYear()} Prayer App. All rights reserved.</p>
        </footer>
        <ThemeToggle className="theme-toggle-fixed" />
      </div>
    </>
  )
}

// async function storePrayersOffline(prayersData: Record<string, PrayerCacheEntry>) {
//   return new Promise<void>((resolve, reject) => {
//     const request = indexedDB.open('PrayersDB', 1)
//
//     request.onerror = () => reject(request.error)
//
//     request.onsuccess = () => {
//       const db = request.result
//       const transaction = db.transaction(['prayers'], 'readwrite')
//       const store = transaction.objectStore('prayers')
//
//       store.clear()
//
//       Object.entries(prayersData).forEach(([slug, prayerData]) => {
//         store.put({ ...prayerData, id: slug })
//       })
//
//       transaction.oncomplete = () => resolve()
//       transaction.onerror = () => reject(transaction.error)
//     }
//
//     request.onupgradeneeded = () => {
//       const db = request.result
//       if (!db.objectStoreNames.contains('prayers')) {
//         db.createObjectStore('prayers', { keyPath: 'id' })
//       }
//     }
//   })
// }
