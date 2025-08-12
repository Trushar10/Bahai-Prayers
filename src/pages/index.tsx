
import Head from 'next/head'
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful'
import { Document } from '@contentful/rich-text-types'
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { client } from '../lib/contentful'
import ThemeToggle from '../components/ThemeToggle'
import LanguageToggle from '../components/LanguageToggle'

const cleanUrlSlug = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, '-')
    .replace(/\-\-+/g, '-');
}

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text
  slug: EntryFieldTypes.Text
  body: EntryFieldTypes.RichText
}>

type PrayerEntry = Entry<PrayerSkeleton>

interface GroupedPrayers {
  [tagName: string]: PrayerEntry[]
}

interface Props {
  prayers: PrayerEntry[];
  languages: { code: string; name: string }[];
}

export default function Home() {
  const router = useRouter();
  const [tagNames, setTagNames] = useState<{ [id: string]: string }>({})
  const [selectedLang, setSelectedLang] = useState('en')
  const [filteredPrayers, setFilteredPrayers] = useState<Array<PrayerEntry>>([])
  const [currentView, setCurrentView] = useState<'home' | 'prayer'>('home')
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerEntry | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Fetch prayers and tag names together
  useEffect(() => {
    async function fetchPrayersAndTags() {
      const res = await fetch(`/api/prayers?lang=${selectedLang}`)
      const data = await res.json()
      setFilteredPrayers(Array.isArray(data.items) ? data.items : (data.items ?? []))
      const mapping: { [id: string]: string } = {}
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach((tag: { sys: { id: string }, name?: string }) => {
          mapping[tag.sys.id] = tag.name || tag.sys.id
        })
      }
      const fallbackMappings = {
        'obligatory-prayers': 'The Obligatory Prayers',
        'general-prayers': 'General Prayers',
        'morning-prayers': 'Morning Prayers',
        'evening-prayers': 'Evening Prayers',
        'daily-prayers': 'Daily Prayers',
        'special-prayers': 'Special Prayers',
        'healing-prayers': 'Healing Prayers',
        'protection-prayers': 'Protection Prayers',
        'generalPrayers': 'General Prayers',
        'theObligatoryPrayers': 'The Obligatory Prayers',
        'obligatoryPrayers': 'The Obligatory Prayers',
        'specialPrayers': 'Special Prayers',
        'morningPrayers': 'Morning Prayers',
        'eveningPrayers': 'Evening Prayers',
        'healingPrayers': 'Healing Prayers',
        'protectionPrayers': 'Protection Prayers',
        'obligatory': 'The Obligatory Prayers',
        'general': 'General Prayers',
        'morning': 'Morning Prayers',
        'evening': 'Evening Prayers',
        'daily': 'Daily Prayers',
        'special': 'Special Prayers',
        'healing': 'Healing Prayers',
        'protection': 'Protection Prayers',
      };
      Object.entries(fallbackMappings).forEach(([id, name]) => {
        if (!mapping[id]) {
          mapping[id] = name;
        }
      });
      setTagNames(mapping)
    }
    fetchPrayersAndTags()
  }, [selectedLang])

  // Persist selected language to localStorage  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLang', selectedLang)
    }
  }, [selectedLang])

  // Get language from localStorage on startup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('selectedLang')
      if (savedLang && ['en', 'hi', 'gu'].includes(savedLang)) {
        setSelectedLang(savedLang)
      }
    }
  }, [])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Handle language changes from URL
      if (event.state?.lang && event.state.lang !== selectedLang) {
        setSelectedLang(event.state.lang)
      }
      
      if (event.state?.view === 'prayer' && event.state?.prayerSlug) {
        // Navigate to prayer view
        const prayerSlug = event.state.prayerSlug
        fetchPrayerContent(prayerSlug).then((prayer) => {
          if (prayer) {
            // Immediate scroll to top when navigating via browser back/forward
            window.scrollTo({ top: 0, behavior: 'instant' })
            setSelectedPrayer(prayer)
            setCurrentView('prayer')
          }
        })
      } else {
        // Navigate back to home
        handleBack(false) // false = don't push to history
      }
    }

    // Set initial history state
    if (typeof window !== 'undefined' && !window.history.state) {
      window.history.replaceState({ view: 'home', lang: selectedLang }, '', '/')
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [selectedLang])

  const fetchPrayerContent = async (slug: string): Promise<PrayerEntry | null> => {
    try {
      const res = await fetch(`/api/prayer/${slug}?lang=${selectedLang}`)
      if (!res.ok) {
        throw new Error('Failed to fetch prayer')
      }
      const data = await res.json()
      return data.prayer || null
    } catch (error) {
      console.error('Error fetching prayer:', error)
      return null
    }
  }

  const handleClick = async (slug: string) => {
    if (isAnimating) return
    setIsAnimating(true)
    const prayer = await fetchPrayerContent(slug)
    if (prayer) {
      setSelectedPrayer(prayer)
      setCurrentView('prayer')
      const originalSlug = typeof prayer.fields.slug === 'string' ? prayer.fields.slug : String(prayer.fields.slug)
      const urlSlug = cleanUrlSlug(originalSlug)
      window.history.pushState(
        { view: 'prayer', prayerSlug: slug, lang: selectedLang }, 
        '', 
        `/${urlSlug}`
      )
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }, 100)
    }
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleBack = (pushToHistory: boolean = true) => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentView('home')
    if (pushToHistory && typeof window !== 'undefined') {
      window.history.pushState({ view: 'home', lang: selectedLang }, '', '/')
    }
    setTimeout(() => {
      setSelectedPrayer(null)
      setIsAnimating(false)
    }, 300)
  }

  const generateFallbackTagName = (tagId: string): string => {
    const tagNameMap: { [key: string]: string } = {
      'obligatory-prayers': 'The Obligatory Prayers',
      'general-prayers': 'General Prayers',
      'morning-prayers': 'Morning Prayers',
      'evening-prayers': 'Evening Prayers',
      'daily-prayers': 'Daily Prayers',
      'special-prayers': 'Special Prayers',
      'healing-prayers': 'Healing Prayers',
      'protection-prayers': 'Protection Prayers',
      'spiritual-development': 'Spiritual Development',
      'devotional-prayers': 'Devotional Prayers',
      'obligatory': 'The Obligatory Prayers',
      'general': 'General Prayers',
      'morning': 'Morning Prayers',
      'evening': 'Evening Prayers',
      'daily': 'Daily Prayers',
      'special': 'Special Prayers',
      'healing': 'Healing Prayers',
      'protection': 'Protection Prayers',
      'generalPrayers': 'General Prayers',
      'theObligatoryPrayers': 'The Obligatory Prayers',
      'obligatoryPrayers': 'The Obligatory Prayers',
      'specialPrayers': 'Special Prayers',
      'morningPrayers': 'Morning Prayers',
      'eveningPrayers': 'Evening Prayers',
      'healingPrayers': 'Healing Prayers',
      'protectionPrayers': 'Protection Prayers',
    };
    return tagNameMap[tagId] || tagId
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  const groupedPrayers: GroupedPrayers = useMemo(() => {
    if (Object.keys(tagNames).length === 0) {
      return {};
    }
    return filteredPrayers.reduce((acc, prayer) => {
      const tags = prayer.metadata?.tags || []
      if (tags.length === 0) {
        if (!acc['Other']) acc['Other'] = []
        acc['Other'].push(prayer)
      } else {
        tags.forEach((tag) => {
          const tagId = tag.sys?.id || 'Other'
          let displayName = tagNames[tagId]
          if (!displayName || displayName === tagId) {
            displayName = generateFallbackTagName(tagId)
          }
          if (!acc[displayName]) acc[displayName] = []
          acc[displayName].push(prayer)
        })
      }
      return acc
    }, {} as GroupedPrayers)
  }, [filteredPrayers, tagNames])

  const obligatory = Object.keys(groupedPrayers).find(
    name => name.toLowerCase().includes('obligatory')
  )
  const general = Object.keys(groupedPrayers).find(
    name => name.toLowerCase().includes('general')
  )
  const other = Object.keys(groupedPrayers).find(
    name => name.toLowerCase() === 'other'
  )
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/bahai-stories.webp" />
        <meta name="theme-color" content="#317EFB" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Prayer App" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </Head>

      <div className="container">
        <div className={`page-container ${currentView === 'prayer' ? 'slide-left' : ''}`}>
          {/* Homepage View */}
          <div className="page-view">
            <header className="header">
              <div className="header-content">
                <div className="title">Prayers</div>
                <LanguageToggle
                  languages={[{ code: 'en', name: 'English' }, { code: 'hi', name: 'हिन्दी' }, { code: 'gu', name: 'ગુજરાતી' }]}
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
          </div>

          {/* Prayer Detail View */}
          <div className="page-view">
            {selectedPrayer && (
              <>
                <header className="header">
                  <div className="header-content">
                    <button className="back-btn" onClick={() => handleBack()}>
                      ← Back
                    </button>
                    <div className="title">
                      {typeof selectedPrayer.fields.title === 'string'
                        ? selectedPrayer.fields.title
                        : 'Prayer'}
                    </div>          
                  </div>
                </header>

                <main className="single-post" style={{ display: 'block' }}>
                  <article className="post-content">
                    <h1>
                      {typeof selectedPrayer.fields.title === 'string'
                        ? selectedPrayer.fields.title
                        : 'Prayer'}
                    </h1>
                    <div className="content">
                      {documentToReactComponents(selectedPrayer.fields.body as Document)}
                    </div>
                  </article>
                </main>
                <footer className="footer">
                  <p>&copy; {new Date().getFullYear()} Prayer App. All rights reserved.</p>
                </footer>
              </>
            )}
          </div>
        </div>
        <ThemeToggle className="theme-toggle-fixed" />
      </div>
    </>
  )
}
