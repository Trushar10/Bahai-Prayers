import Head from 'next/head'
import { GetStaticProps } from 'next'
import { useEffect, useState, useMemo } from 'react'
import { Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful'
import { Document } from '@contentful/rich-text-types'
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { client } from '../lib/contentful'
import ThemeToggle from '../components/ThemeToggle'
import LanguageToggle from '../components/LanguageToggle'

// Helper function to clean URL slugs (replace spaces with hyphens)
const cleanUrlSlug = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/\-\-+/g, '-'); // Replace multiple hyphens with single hyphen
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

export default function Home({ prayers, languages }: Props) {
  // State to hold tag ID to name mapping
  const [tagNames, setTagNames] = useState<{ [id: string]: string }>({})
  
  // Get language from URL path or localStorage or default to English
  const getInitialLang = () => {
    if (typeof window !== 'undefined') {
      // Check if we're on a language-specific path
      const pathname = window.location.pathname;
      const pathLang = pathname.split('/')[1]; // Get first segment after /
      
      if (pathLang && ['en', 'hi', 'gu'].includes(pathLang)) {
        localStorage.setItem('selectedLang', pathLang);
        return pathLang;
      }
      
      // Check localStorage
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
  const [currentView, setCurrentView] = useState<'home' | 'prayer'>('home')
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerEntry | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Redirect root path to /en for consistency
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      window.history.replaceState(null, '', '/en')
    }
  }, [])

  // Handle language change with URL update
  const handleLanguageChange = (newLang: string) => {
    setSelectedLang(newLang)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLang', newLang)
      
      // Update URL based on language - all languages now use prefix consistently
      const newUrl = currentView === 'home' 
        ? `/${newLang}`
        : `/${newLang}/${selectedPrayer?.fields.slug || ''}`
      
      window.history.pushState(
        { view: currentView, lang: newLang }, 
        '', 
        newUrl
      )
    }
  }

  // Fetch prayers and tag names together
  useEffect(() => {
    async function fetchPrayersAndTags() {
      console.log(`Fetching prayers for language: ${selectedLang}`)
      const res = await fetch(`/api/prayers?lang=${selectedLang}`)
      const data = await res.json()
      
      console.log('Raw API data:', data)
      
      // Set prayers
      setFilteredPrayers(Array.isArray(data.items) ? data.items : (data.items ?? []))
      
      // Build comprehensive tag name mapping from API response + fallbacks
      const mapping: { [id: string]: string } = {}
      
      // First, add mappings from API response
      if (data.tags && Array.isArray(data.tags)) {
        console.log('Processing tags from API:', data.tags)
        data.tags.forEach((tag: { sys: { id: string }, name?: string }) => {
          mapping[tag.sys.id] = tag.name || tag.sys.id
          console.log(`Setting tag mapping: ${tag.sys.id} = ${tag.name || tag.sys.id}`)
        })
      }
      
      // Also add comprehensive fallback mappings for any tag IDs we might encounter
      const fallbackMappings = {
        // Kebab-case IDs (from Management API)
        'obligatory-prayers': 'The Obligatory Prayers',
        'general-prayers': 'General Prayers',
        'morning-prayers': 'Morning Prayers',
        'evening-prayers': 'Evening Prayers',
        'daily-prayers': 'Daily Prayers',
        'special-prayers': 'Special Prayers',
        'healing-prayers': 'Healing Prayers',
        'protection-prayers': 'Protection Prayers',
        
        // CamelCase IDs (from prayer metadata)
        'generalPrayers': 'General Prayers',
        'theObligatoryPrayers': 'The Obligatory Prayers',
        'obligatoryPrayers': 'The Obligatory Prayers',
        'specialPrayers': 'Special Prayers',
        'morningPrayers': 'Morning Prayers',
        'eveningPrayers': 'Evening Prayers',
        'healingPrayers': 'Healing Prayers',
        'protectionPrayers': 'Protection Prayers',
        
        // Short forms
        'obligatory': 'The Obligatory Prayers',
        'general': 'General Prayers',
        'morning': 'Morning Prayers',
        'evening': 'Evening Prayers',
        'daily': 'Daily Prayers',
        'special': 'Special Prayers',
        'healing': 'Healing Prayers',
        'protection': 'Protection Prayers',
      };
      
      // Add fallback mappings (without overriding API mappings)
      Object.entries(fallbackMappings).forEach(([id, name]) => {
        if (!mapping[id]) {
          mapping[id] = name;
        }
      });
      
      console.log('Final tag mapping being set:', mapping)
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

  // Fetch individual prayer content via API
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
      
      // Clean the original slug for URL use
      const originalSlug = typeof prayer.fields.slug === 'string' ? prayer.fields.slug : String(prayer.fields.slug)
      const urlSlug = cleanUrlSlug(originalSlug)
      
      // Create URL based on language - all languages now use prefix for consistency
      const prayerUrl = `/${selectedLang}/${urlSlug}`
      
      // Push prayer view to history for system back button support
      // Store the original slug for API calls
      if (typeof window !== 'undefined') {
        window.history.pushState(
          { view: 'prayer', prayerSlug: slug, lang: selectedLang }, 
          '', 
          prayerUrl
        )
      }
      
      // Scroll to top instantly so user can read from the beginning
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }, 100)
    }
    
    // Small delay to ensure state updates before animation ends
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleBack = (pushToHistory: boolean = true) => {
    if (isAnimating) return
    
    setIsAnimating(true)
    
    setCurrentView('home')
    
    // Update browser history if this is a manual back action
    if (pushToHistory && typeof window !== 'undefined') {
      const homeUrl = `/${selectedLang}`
      window.history.pushState({ view: 'home', lang: selectedLang }, '', homeUrl)
    }
    
    // Clear selected prayer after animation
    setTimeout(() => {
      setSelectedPrayer(null)
      setIsAnimating(false)
    }, 300)
  }

  // Fallback function to generate readable tag names (same as in API)
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
      // Common variations and actual IDs from Contentful
      'obligatory': 'The Obligatory Prayers',
      'general': 'General Prayers',
      'morning': 'Morning Prayers',
      'evening': 'Evening Prayers',
      'daily': 'Daily Prayers',
      'special': 'Special Prayers',
      'healing': 'Healing Prayers',
      'protection': 'Protection Prayers',
      // Actual IDs from your Contentful space
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

  // Group prayers by tags - with proper dependency on tagNames being loaded
  const groupedPrayers: GroupedPrayers = useMemo(() => {
    // Only group prayers if we have tag names loaded
    if (Object.keys(tagNames).length === 0) {
      console.log('Skipping grouping - tagNames not loaded yet');
      return {};
    }
    
    console.log('Grouping prayers with tagNames:', tagNames);
    
    return filteredPrayers.reduce((acc, prayer) => {
      const tags = prayer.metadata?.tags || []
      if (tags.length === 0) {
        if (!acc['Other']) acc['Other'] = []
        acc['Other'].push(prayer)
      } else {
        tags.forEach((tag) => {
          const tagId = tag.sys?.id || 'Other'
          
          // Try to get tag name from tagNames mapping, otherwise use fallback
          let displayName = tagNames[tagId]
          
          console.log(`Processing tag: ${tagId}, found in mapping: ${!!displayName}, value: ${displayName}`)
          
          if (!displayName || displayName === tagId) {
            // Fallback tag name generation if mapping failed
            displayName = generateFallbackTagName(tagId)
            console.log(`Using fallback for ${tagId}: ${displayName}`)
          }
          
          if (!acc[displayName]) acc[displayName] = []
          acc[displayName].push(prayer)
        })
      }
      return acc
    }, {} as GroupedPrayers)
  }, [filteredPrayers, tagNames]) // Re-run when tagNames changes

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

    // Set initial history state with language
    if (typeof window !== 'undefined' && !window.history.state) {
      const homeUrl = selectedLang === 'en' ? '/' : `/${selectedLang}`
      window.history.replaceState({ view: 'home', lang: selectedLang }, '', homeUrl)
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [selectedLang])

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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/profile-circle.webp" />
        <meta name="theme-color" content="#317EFB" />
        
        {/* Mobile app-like behavior */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Prayer App" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Prevent zoom on input focus */}
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
                  languages={languages}
                  currentLang={selectedLang}
                  onChange={handleLanguageChange}
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
