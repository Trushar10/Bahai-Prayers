import Head from 'next/head'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import LanguageToggle from '../components/LanguageToggle'
import { track } from '@vercel/analytics'
import { pageview } from '@vercel/analytics'

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
    } catch (_error) {
      // Silent error - cache read failed
    }
    return null
  }, [])

  const setCachedPrayers = useCallback((lang: string, data: { items: Prayer[], tags?: TagEntry[] }) => {
    try {
      localStorage.setItem(`prayers_${lang}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (_error) {
      // Silent error - cache write failed
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
          
          // Track home page load with prayers count
          track('home_page_load', {
            language: selectedLang,
            prayers_count: data.items.length
          });
          
          // Cache the successful response
          setCachedPrayers(selectedLang, data)
        }
      } catch (_error) {
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
          return cachedPrayer
        }
      }
      
      return null
    } catch (_error) {
      // Fallback to cached data on error
      const cachedData = getCachedPrayers(selectedLang)
      if (cachedData && cachedData.items) {
        const cachedPrayer = cachedData.items.find(prayer => {
          const cleanSlug = prayer.fields.slug?.trim().toLowerCase().replace(/\s+/g, '-').replace(/\-\-+/g, '-')
          return cleanSlug === slug
        })
        if (cachedPrayer) {
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
      // Track prayer page view as a proper page view
      pageview({ path: `/${slug}` });
      
      // Also track as custom event with metadata
      track('prayer_view', {
        prayer_title: typeof prayer.fields.title === 'string' ? prayer.fields.title : 'Unknown Prayer',
        prayer_slug: slug,
        language: selectedLang
      });

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
    }
  }, [getPrayerBySlug])

  // Handle language change with tracking
  const handleLanguageChange = useCallback((newLang: string) => {
    track('language_change', {
      from_language: selectedLang,
      to_language: newLang
    });
    setSelectedLang(newLang);
  }, [selectedLang]);

  // Handle going back to prayer list
  const handleBackClick = useCallback(() => {
    // Update browser history to go back
    window.history.back()
  }, [])

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (showPost) {
        // Track return to home page as a page view
        pageview({ path: '/' });
        
        // Track return to home page
        track('navigation', {
          action: 'back_to_home',
          from_page: 'prayer_page'
        });

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

  // Handle direct visits to prayer URLs (when someone visits a link with hash)
  useEffect(() => {
    const handleInitialHash = async () => {
      if (prayers.length > 0 && typeof window !== 'undefined') {
        const hash = window.location.hash.slice(1); // Remove the # symbol
        if (hash && hash !== '') {
          // Track the direct visit to prayer page
          pageview({ path: `/${hash}` });
          
          // Load and show the prayer
          const prayer = await getPrayerBySlug(hash);
          if (prayer) {
            setSelectedPrayer(prayer);
            setShowPost(true);
            
            track('prayer_view', {
              prayer_title: typeof prayer.fields.title === 'string' ? prayer.fields.title : 'Unknown Prayer',
              prayer_slug: hash,
              language: selectedLang,
              visit_type: 'direct_link'
            });
          }
        }
      }
    };

    handleInitialHash();
  }, [prayers, selectedLang, getPrayerBySlug]);

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
      // User accepted the install prompt
    } else {
      // User dismissed the install prompt
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
  }, [deferredPrompt])

  // Handle sharing prayer
  const handleShare = useCallback(async (prayer: Prayer) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: prayer.fields.title,
          text: renderPrayerContentAsText(prayer.fields.body),
          url: window.location.href,
        })
      } catch (error) {
        // User cancelled sharing or error occurred
        console.log('Sharing cancelled or failed:', error)
      }
    } else {
      // Fallback to copy
      handleCopy(prayer)
    }
  }, [])

  // Handle copying prayer
  const handleCopy = useCallback(async (prayer: Prayer) => {
    try {
      const text = `${prayer.fields.title}\n\n${renderPrayerContentAsText(prayer.fields.body)}`
      await navigator.clipboard.writeText(text)
      // Show success feedback - you could add a toast notification here
      console.log('Prayer copied to clipboard')
    } catch (error) {
      console.error('Failed to copy prayer:', error)
    }
  }, [])

  // Helper function to render prayer content as plain text
  const renderPrayerContentAsText = useCallback((body: unknown): string => {
    if (!body) return 'No content available for this prayer.'

    // Handle both string and object formats
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (_parseError) {
        return 'Content format is corrupted.'
      }
    }

    // Simple content rendering - extract text for sharing/copying
    if (body && typeof body === 'object' && body !== null && 'content' in body) {
      const bodyObj = body as { content: Array<{ nodeType: string; content?: Array<{ value?: string }> }> }
      return bodyObj.content.map((node) => {
        if (node.nodeType === 'paragraph' && node.content) {
          return node.content.map((textNode) => textNode.value || '').join('')
        }
        return ''
      }).join('\n\n')
    }

    return 'Unable to extract prayer content.'
  }, [])

  // Check if prayer is available offline
  const isPrayerAvailableOffline = useCallback((prayer: Prayer): boolean => {
    try {
      const cached = localStorage.getItem(`prayers_${selectedLang}`)
      if (cached) {
        const parsedData = JSON.parse(cached)
        if (parsedData.data && parsedData.data.items) {
          return parsedData.data.items.some((cachedPrayer: Prayer) => 
            cachedPrayer.sys.id === prayer.sys.id
          )
        }
      }
    } catch (_error) {
      // Silent error - cache read failed
    }
    return false
  }, [selectedLang])

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
      // Define the desired order
      const tagOrder = ['obligatory', 'general', 'tablet'];
      
      // Get the order index for each tag
      const getOrderIndex = (tagName: string): number => {
        const lowerTagName = tagName.toLowerCase();
        if (lowerTagName.includes('obligatory')) return 0;
        if (lowerTagName.includes('general')) return 1;
        if (lowerTagName.includes('tablet')) return 2;
        return 999; // Put unrecognized tags at the end
      };
      
      const indexA = getOrderIndex(tagNameA);
      const indexB = getOrderIndex(tagNameB);
      
      // If both tags have the same order index, sort alphabetically
      if (indexA === indexB) {
        return tagNameA.localeCompare(tagNameB);
      }
      
      return indexA - indexB;
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
      } catch (_parseError) {
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
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <div>Loading prayers...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Bahá&apos;í Prayers</title>
        <meta name="description" content="Modern Bahá'í Prayers app with elegant design and native app experience" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#667eea" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Prayers" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* App Container */}
      <div className="app">
        {/* Navigation Header */}
        <div className="nav-header">
          <div className="nav-content">
            <div className="nav-left">
              {selectedPrayer && (
                <button className="nav-btn back-btn" onClick={handleBackClick}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15,18 9,12 15,6"></polyline>
                  </svg>
                  Back
                </button>
              )}
            </div>
            {!selectedPrayer && (
              <div className="nav-right">
                {!isInstalled && deferredPrompt && (
                  <button 
                    className="nav-install-btn" 
                    onClick={handleInstallClick}
                    title="Install App"
                  >
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M12 9V15M12 15L10 13M12 15L14 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
                <LanguageToggle 
                  languages={[
                    { code: 'en', name: 'English' },
                    { code: 'hi', name: 'हिन्दी' },
                    { code: 'gu', name: 'ગુજરાતી' }
                  ]}
                  currentLang={selectedLang}
                  onChange={handleLanguageChange}
                />
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>

        {/* Feedback Link */}
        <div className="feedback-banner">
          <div className="feedback-content">
            <a
              href="https://forms.gle/sG99p4CB78WPX8y46"
              target="_blank"
              rel="noopener noreferrer"
              className="feedback-link"
            >
              <span>📝</span>
              Share Your Feedback
            </a>
          </div>
        </div>

        {/* Page Container */}
        <div className={`page-container ${showPost ? 'push-right' : ''}`}>
          {/* Home Page */}
          <div className="page home-page">
            <div className="page-content" id="homePage">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <div>Loading prayers...</div>
                </div>
              ) : (
                <>
                  <div className="welcome-section">
                    <h1 className="welcome-title">
                      Bahá&apos;í Prayers
                    </h1>
                    <p className="welcome-subtitle">
                      Find peace and guidance through prayer
                    </p>
                  </div>
                  <div className="prayer-sections">
                    {sortedGroupedPrayers.map(([tagName, prayersInGroup]) => (
                    <div key={tagName} className="prayer-section fade-in-up">
                      <div className="section-header">
                        <h2 className="section-title">{tagName}</h2>
                        <span className="section-count">{prayersInGroup.length}</span>
                      </div>
                      <div className="prayer-grid">
                        {prayersInGroup.map((prayer) => (
                          <div
                            key={prayer.sys.id}
                            className="prayer-card"
                            onClick={() => handlePrayerClick(cleanUrlSlug(prayer.fields.slug))}
                          >
                            <h3 className="prayer-title">{prayer.fields.title}</h3>
                            <div className={`prayer-meta ${isPrayerAvailableOffline(prayer) ? 'offline-available' : 'online-only'}`}>
                              <svg
                                className="prayer-icon"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                {isPrayerAvailableOffline(prayer) ? (
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                ) : (
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM8 12l4 4 4-4-4-4-4 4z" />
                                )}
                              </svg>
                              <span>{isPrayerAvailableOffline(prayer) ? 'Available Offline' : 'Online Only'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Detail Page */}
          <div className="page prayer-view-page">
            <div className="detail-page" ref={singlePostRef}>
              {selectedPrayer && (
                <div className="prayer-detail">
                  <div className="prayer-header">
                    <h1 className="prayer-detail-title">{selectedPrayer.fields.title}</h1>                    
                  </div>
                  <div className="prayer-content">
                    <div className="prayer-text">
                      {renderPrayerContent(selectedPrayer.fields.body)}
                    </div>
                  </div>
                  <div className="action-buttons">
                    <button className="action-btn" onClick={() => handleShare(selectedPrayer)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                      </svg>
                      Share
                    </button>
                    <button className="action-btn primary" onClick={() => handleCopy(selectedPrayer)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      
        {/* Bottom Safe Area */}
        <div className="bottom-safe-area"></div>
      </div>
    </>
  )
}
