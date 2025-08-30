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
    body: any
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
  const [selectedTag, setSelectedTag] = useState('all')
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
    if (!prayer.fields.tags || prayer.fields.tags.length === 0) {
      if (!acc['Other']) acc['Other'] = []
      acc['Other'].push(prayer)
      return acc
    }

    prayer.fields.tags.forEach((tagRef: any) => {
      const tagId = tagRef.sys.id
      const tagName = tagMapping[tagId] || tagId
      
      if (!acc[tagName]) acc[tagName] = []
      acc[tagName].push(prayer)
    })

    return acc
  }, {} as GroupedPrayers)

  const cleanUrlSlug = (text: string): string => {
    return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/\-\-+/g, '-')
  }

  const renderPrayerContent = (body: any) => {
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
    if (body && body.content) {
      return body.content.map((node: any, index: number) => {
        if (node.nodeType === 'paragraph' && node.content) {
          return (
            <p key={index}>
              {node.content.map((textNode: any, textIndex: number) => (
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

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">🙏 Prayer App</h1>
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
        </header>

        {/* Main Content */}
        <main className="main-content">
          {selectedPrayer ? (
            /* Prayer Detail View */
            <div className="prayer-detail">
              <button 
                className="back-button"
                onClick={() => setSelectedPrayer(null)}
              >
                ← Back to List
              </button>
              
              <article className="prayer-content">
                <h1 className="prayer-title">
                  {selectedPrayer.fields.title}
                </h1>
                <div className="content">
                  {renderPrayerContent(selectedPrayer.fields.body)}
                </div>
              </article>
            </div>
          ) : (
            /* Prayer List View */
            <div className="prayer-list">
              <div className="filter-controls">
                <select 
                  value={selectedTag} 
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="tag-filter"
                >
                  <option value="all">All Categories</option>
                  {Object.keys(groupedPrayers).map(tagName => (
                    <option key={tagName} value={tagName}>{tagName}</option>
                  ))}
                </select>
              </div>

              {selectedTag === 'all' ? (
                /* Show all grouped prayers */
                Object.entries(groupedPrayers).map(([tagName, prayersInGroup]) => (
                  <div key={tagName} className="prayer-group">
                    <h2 className="group-title">{tagName}</h2>
                    <div className="prayer-cards">
                      {prayersInGroup.map((prayer) => (
                        <div
                          key={prayer.sys.id}
                          className="prayer-card"
                          onClick={() => handlePrayerClick(cleanUrlSlug(prayer.fields.slug))}
                        >
                          <h3 className="prayer-card-title">{prayer.fields.title}</h3>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                /* Show prayers for selected tag */
                <div className="prayer-group">
                  <h2 className="group-title">{selectedTag}</h2>
                  <div className="prayer-cards">
                    {(groupedPrayers[selectedTag] || []).map((prayer) => (
                      <div
                        key={prayer.sys.id}
                        className="prayer-card"
                        onClick={() => handlePrayerClick(cleanUrlSlug(prayer.fields.slug))}
                      >
                        <h3 className="prayer-card-title">{prayer.fields.title}</h3>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Theme Toggle */}
        <ThemeToggle className="theme-toggle-fixed" />
      </div>
    </>
  )
}
