import Head from 'next/head'
import { useEffect, useState } from 'react';
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

interface GroupedPrayers {
  [tagName: string]: Prayer[]
}

export default function Home() {
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [selectedLang, setSelectedLang] = useState('en')
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null)
  const [tagMapping, setTagMapping] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)

  // Build tag mapping from prayers data
  const buildTagMapping = (prayers: Prayer[], tags?: TagEntry[]) => {
    const mapping: { [key: string]: string } = {}
    
    if (tags) {
      tags.forEach(tag => {
        mapping[tag.sys.id] = tag.name
      })
    }
    
    setTagMapping(mapping)
  }

  // Fetch prayers
  useEffect(() => {
    const fetchPrayers = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/prayers?lang=${selectedLang}`)
        
        if (!res.ok) {
          throw new Error(`Failed to fetch prayers: ${res.status}`)
        }

        const data = await res.json()
        
        if (data.items && Array.isArray(data.items)) {
          setPrayers(data.items)
          buildTagMapping(data.items, data.tags)
        }
      } catch (error) {
        console.error('Error fetching prayers:', error)
        setPrayers([])
      } finally {
        setLoading(false)
      }
    }

    fetchPrayers()
  }, [selectedLang])

  // Get prayer by slug
  const getPrayerBySlug = async (slug: string): Promise<Prayer | null> => {
    try {
      // First check if prayer is in current list
      const prayerFromList = prayers.find(prayer => {
        const cleanSlug = prayer.fields.slug?.trim().toLowerCase().replace(/\s+/g, '-').replace(/\-\-+/g, '-')
        return cleanSlug === slug
      })
      
      if (prayerFromList) {
        return prayerFromList
      }
      
      // If not found, fetch from API
      const res = await fetch(`/api/prayer/${slug}?lang=${selectedLang}`)
      const data = await res.json()
      return data.prayer || null
    } catch (error) {
      console.error('Error fetching prayer:', error)
      return null
    }
  }

  // Handle prayer selection
  const handlePrayerClick = async (slug: string) => {
    const prayer = await getPrayerBySlug(slug)
    if (prayer) {
      setSelectedPrayer(prayer)
    }
  }

  // Filter prayers by tag
  const groupedPrayers: GroupedPrayers = prayers.reduce((acc, prayer) => {
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

  // Sort grouped prayers to put "Obligatory" first
  const sortedGroupedPrayers = Object.entries(groupedPrayers).sort(([tagNameA], [tagNameB]) => {
    // "Obligatory" should come first
    if (tagNameA.toLowerCase().includes('obligatory')) return -1
    if (tagNameB.toLowerCase().includes('obligatory')) return 1
    
    // Then sort alphabetically for other categories
    return tagNameA.localeCompare(tagNameB)
  })

  const cleanUrlSlug = (text: string): string => {
    return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/\-\-+/g, '-')
  }

  const renderPrayerContent = (body: unknown) => {
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
  }

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
                onClick={() => setSelectedPrayer(null)}
              >
                ←
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

        <div className="page-container">
          <div className="page-view">
            {selectedPrayer ? (
              /* Single Post View */
              <div className="single-post" style={{ display: 'block' }}>
                <div className="post-content">
                  <h1>{selectedPrayer.fields.title}</h1>
                  <div className="content">
                    {renderPrayerContent(selectedPrayer.fields.body)}
                  </div>
                </div>
              </div>
            ) : (
              /* Homepage View */
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
            )}
          </div>
        </div>
      </div>

      {/* Theme Toggle */}
      <ThemeToggle className="theme-toggle-fixed" />
    </>
  )
}
