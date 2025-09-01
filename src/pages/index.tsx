import Head from 'next/head'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import LanguageToggle from '../components/LanguageToggle'

// Simplified prayer type
interface Prayer {
  sys: { id: string }
  fields: {
    title: string
    slug: string
    body: unknown
  }
  metadata?: {
    tags?: Array<{ sys: { id: string } }>
  }
}

// Tag entry type
interface TagEntry {
  sys: { id: string }
  name: string
}

// PWA Install Prompt Event interface
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface GroupedPrayers {
  [tagName: string]: Prayer[]
}

export default function Home() {
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [selectedLang, setSelectedLang] = useState('en')
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null)
  const [tagMapping, setTagMapping] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [showPost, setShowPost] = useState(false)
  const singlePostRef = useRef<HTMLDivElement>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  
  // PWA installation detection
  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check if running in standalone mode (installed as PWA)
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return
      }
      
      // Check for iOS standalone mode
      if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) {
        setIsInstalled(true)
        return
      }
      
      // Check for Android installed app
      if (document.referrer.startsWith('android-app://')) {
        setIsInstalled(true)
        return
      }
    }

    checkIfInstalled()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const installEvent = e as BeforeInstallPromptEvent
      installEvent.preventDefault()
      setDeferredPrompt(installEvent)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Build tag mapping from prayers data
  const buildTagMapping = useCallback((prayers: Prayer[], tags?: TagEntry[]) => {
    const mapping: { [key: string]: string } = {}
    
    if (tags) {
      tags.forEach(tag => {
        mapping[tag.sys.id] = tag.name
      })
    }
    
    setTagMapping(mapping)
  }, [])

  // Simple offline cache using localStorage
  const getCachedPrayers = useCallback((lang: string): { items: Prayer[], tags?: TagEntry[] } | null => {
    try {
      const cached = localStorage.getItem(`prayers_${lang}`)
      if (cached) {
        const parsedData = JSON.parse(cached)
        // Check if cache is not too old (24 hours)
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours
        const age = Date.now() - parsedData.timestamp
        if (age < maxAge) {
          return parsedData.data
        } else {
          localStorage.removeItem(`prayers_${lang}`)
        }
      }
    } catch (error) {
      console.error('Error reading cached prayers:', error)
    }
    return null
  }, [])

  const setCachedPrayers = useCallback((lang: string, data: { items: Prayer[], tags?: TagEntry[] }) => {
    try {
      localStorage.setItem(`prayers_${lang}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Error caching prayers:', error)
    }
  }, [])

  // Fetch prayers with offline fallback
  useEffect(() => {
    const fetchPrayers = async () => {
      try {
        setLoading(true)
        
        // Try to fetch from API
        const res = await fetch(`/api/prayers?lang=${selectedLang}`)
        
        if (!res.ok) {
          throw new Error(`Failed to fetch prayers: ${res.status}`)
        }

        const data = await res.json()
        
        if (data.items && Array.isArray(data.items)) {
          setPrayers(data.items)
          buildTagMapping(data.items, data.tags)
          
          // Cache the successful response
          setCachedPrayers(selectedLang, data)
        }
      } catch (error) {
        console.error('Error fetching prayers:', error)
        
        // Try to use cached data when offline or on error
        const cachedData = getCachedPrayers(selectedLang)
        if (cachedData && cachedData.items) {
          setPrayers(cachedData.items)
          buildTagMapping(cachedData.items, cachedData.tags)
        } else {
          setPrayers([])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPrayers()
  }, [selectedLang, buildTagMapping, getCachedPrayers, setCachedPrayers])

  // Get prayer by slug with offline fallback
  const getPrayerBySlug = useCallback(async (slug: string): Promise<Prayer | null> => {
    try {
      // First check if prayer is in current list
      const prayerFromList = prayers.find(prayer => {
        const cleanSlug = prayer.fields.slug?.trim().toLowerCase().replace(/\s+/g, '-').replace(/\-\-+/g, '-')
        return cleanSlug === slug
      })
      
      if (prayerFromList) {
        return prayerFromList
      }
      
      // Try to fetch from API
      const res = await fetch(`/api/prayer/${slug}?lang=${selectedLang}`)
      if (res.ok) {
        const data = await res.json()
        return data.prayer || null
      }
      
      // If API fails, search in cached data
      const cachedData = getCachedPrayers(selectedLang)
      if (cachedData && cachedData.items) {
        const cachedPrayer = cachedData.items.find(prayer => {
          const cleanSlug = prayer.fields.slug?.trim().toLowerCase().replace(/\s+/g, '-').replace(/\-\-+/g, '-')
          return cleanSlug === slug
        })
        if (cachedPrayer) {
          console.log('Using cached prayer for offline mode')
          return cachedPrayer
        }
      }
      
      return null
    } catch (error) {
      console.error('Error fetching prayer:', error)
      
      // Fallback to cached data on error
      const cachedData = getCachedPrayers(selectedLang)
      if (cachedData && cachedData.items) {
        const cachedPrayer = cachedData.items.find(prayer => {
          const cleanSlug = prayer.fields.slug?.trim().toLowerCase().replace(/\s+/g, '-').replace(/\-\-+/g, '-')
          return cleanSlug === slug
        })
        if (cachedPrayer) {
          console.log('Using cached prayer for offline mode')
          return cachedPrayer
        }
      }
      
      return null
    }
  }, [prayers, selectedLang, getCachedPrayers])

  // Handle prayer selection (simplified)
  const handlePrayerClick = useCallback(async (slug: string) => {
    const prayer = await getPrayerBySlug(slug)
    if (prayer) {
      // Set prayer content first
      setSelectedPrayer(prayer)
      
      // Reset scroll positions immediately
      window.scrollTo({ top: 0, behavior: 'auto' })
      
      // Reset the single post container scroll position
      if (singlePostRef.current) {
        singlePostRef.current.scrollTop = 0
      }
      
      // Push new history state for the prayer
      window.history.pushState({ page: 'prayer', slug }, '', `#${slug}`)
      
      // Start slide animation after content is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShowPost(true)
        })
      })
      
      // Log user interaction could go here
      console.log('Prayer viewed:', prayer.sys.id)
    }
  }, [getPrayerBySlug])

  // Handle going back to prayer list
  const handleBackClick = useCallback(() => {
    // Update browser history to go back
    window.history.back()
  }, [])

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (showPost) {
        // If we're currently showing a post, go back to homepage
        setShowPost(false)
        
        // Clear selected prayer after slide animation completes
        setTimeout(() => {
          setSelectedPrayer(null)
          // Scroll to top of prayer list after transition
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'auto' })
          })
        }, 400) // Match CSS transition duration
      }
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [showPost])

  // Initialize history state on component mount
  useEffect(() => {
    // Set initial history state for homepage
    if (window.history.state === null) {
      window.history.replaceState({ page: 'home' }, '', '/')
    }
  }, [])

  // Handle PWA installation
  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
  }, [deferredPrompt])

  // Filter prayers by tag (memoized)
  const groupedPrayers: GroupedPrayers = useMemo(() => {
    return prayers.reduce((acc, prayer) => {
      // Get tags from metadata.tags (not fields.tags)
      const prayerTags = prayer.metadata?.tags || [];
      
      if (prayerTags.length === 0) {
        if (!acc['Other']) acc['Other'] = []
        acc['Other'].push(prayer)
        return acc
      }

      prayerTags.forEach((tagRef: { sys: { id: string } }) => {
        const tagId = tagRef.sys.id
        const tagName = tagMapping[tagId] || tagId
        
        if (!acc[tagName]) acc[tagName] = []
        acc[tagName].push(prayer)
      })

      return acc
    }, {} as GroupedPrayers)
  }, [prayers, tagMapping])

  // Sort grouped prayers to put "Obligatory" first (memoized)
  const sortedGroupedPrayers = useMemo(() => {
    return Object.entries(groupedPrayers).sort(([tagNameA], [tagNameB]) => {
      // "Obligatory" should come first
      if (tagNameA.toLowerCase().includes('obligatory')) return -1
      if (tagNameB.toLowerCase().includes('obligatory')) return 1
      
      // Then sort alphabetically for other categories
      return tagNameA.localeCompare(tagNameB)
    })
  }, [groupedPrayers])

  const cleanUrlSlug = useCallback((text: string): string => {
    return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/\-\-+/g, '-')
  }, [])

  const renderPrayerContent = useCallback((body: unknown) => {
    if (!body) {
      return <p>No content available for this prayer.</p>
    }

    // Handle both string and object formats
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (parseError) {
        console.error('Failed to parse body JSON:', parseError)
        return <p>Content format is corrupted.</p>
      }
    }

    // Simple content rendering - just display as text for now
    if (body && typeof body === 'object' && body !== null && 'content' in body) {
      const bodyObj = body as { content: Array<{ nodeType: string; content?: Array<{ value?: string }> }> }
      return bodyObj.content.map((node, index: number) => {
        if (node.nodeType === 'paragraph' && node.content) {
          return (
            <p key={index}>
              {node.content.map((textNode, textIndex: number) => (
                <span key={textIndex}>{textNode.value || ''}</span>
              ))}
            </p>
          )
        }
        return <div key={index}>{JSON.stringify(node)}</div>
      })
    }

    return <p>Unable to display prayer content.</p>
  }, []) // Empty dependency array for renderPrayerContent

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        gap: '1rem'
      }}>
        <div>Loading prayers...</div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Prayer App</title>
        <meta name="description" content="A simple prayer app with content from multiple languages" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Main Container */}
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            {selectedPrayer && (
              <button 
                className="back-btn"
                onClick={handleBackClick}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
                <span>Back</span>
              </button>
            )}
            <h1 className="title">🙏 Prayer App</h1>
                      <div className="header-controls">
            <LanguageToggle 
              languages={[
                { code: 'en', name: 'English' },
                { code: 'hi', name: 'हिन्दी' },
                { code: 'gu', name: 'ગુજરાતી' }
              ]}
              currentLang={selectedLang}
              onChange={setSelectedLang}
            />
          </div>
          </div>
        </div>

        {/* Feedback Link */}
        <div className="feedback-container">
          <a 
            href="https://forms.gle/sG99p4CB78WPX8y46" 
            target="_blank" 
            rel="noopener noreferrer"
            className="feedback-link"
          >
            📝 Share Your Feedback
          </a>
        </div>

        <div className={`page-container ${showPost ? 'slide-left' : ''}`}>
          <div className="page-view">
            {/* Homepage View */}
            <div className="homepage">
              {/* Show all grouped prayers by sections */}
              {sortedGroupedPrayers.map(([tagName, prayersInGroup]) => (
                <div key={tagName} className="prayer-section">
                  <h2 className="section-title">{tagName}</h2>
                  <div className="post-list">
                    {prayersInGroup.map((prayer) => (
                      <div
                        key={prayer.sys.id}
                        className="post-item"
                        onClick={() => handlePrayerClick(cleanUrlSlug(prayer.fields.slug))}
                      >
                        <h3>{prayer.fields.title}</h3>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="page-view">
            {/* Single Post View */}
            <div className="single-post" ref={singlePostRef}>
              {selectedPrayer && (
                <div className="post-content">
                  <h1>{selectedPrayer.fields.title}</h1>
                  <div className="content">
                    {renderPrayerContent(selectedPrayer.fields.body)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add to Home Screen Button */}
      {!isInstalled && deferredPrompt && (
        <button 
          className="install-btn-fixed"
          onClick={handleInstallClick}
          title="Add to Home Screen"
        >
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M12 9V15M12 15L10 13M12 15L14 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Theme Toggle */}
      <ThemeToggle className="theme-toggle-fixed" />
    </>
  )
}
