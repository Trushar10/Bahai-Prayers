import Head from 'next/head'
import { useEffect, useState } from 'react';
import { Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful'
import { Document } from '@contentful/rich-text-types'
import { documentToReactComponents, Options } from '@contentful/rich-text-react-renderer'
import { BLOCKS } from '@contentful/rich-text-types'
import ThemeToggle from '../components/ThemeToggle'
import LanguageToggle from '../components/LanguageToggle'

// Prayer entry type
type PrayerEntryFields = {
  title: EntryFieldTypes.Text
  slug: EntryFieldTypes.Text
  body: Document
  tags: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<any>>
}

type PrayerEntry = Entry<PrayerEntryFields, undefined, string>

// Tag entry type
type TagEntry = {
  sys: { id: string }
  name: string
}

interface GroupedPrayers {
  [tagName: string]: PrayerEntry[]
}

export default function Home() {
  const [filteredPrayers, setFilteredPrayers] = useState<PrayerEntry[]>([])
  const [selectedLang, setSelectedLang] = useState('en')
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerEntry | null>(null)
  const [selectedTag, setSelectedTag] = useState('all')
  const [tagMapping, setTagMapping] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)

  // Custom rich text rendering options
  const richTextOptions: Options = {
    renderNode: {
      [BLOCKS.PARAGRAPH]: (node, children) => <p>{children}</p>,
      [BLOCKS.HEADING_1]: (node, children) => <h1 className="prayer-heading">{children}</h1>,
      [BLOCKS.HEADING_2]: (node, children) => <h2 className="prayer-heading">{children}</h2>,
      [BLOCKS.HEADING_3]: (node, children) => <h3 className="prayer-heading">{children}</h3>,
    },
  }

  // Build tag mapping from prayers data
  const buildTagMapping = (prayers: PrayerEntry[], tags?: TagEntry[]) => {
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
          const prayers: PrayerEntry[] = data.items
          setFilteredPrayers(prayers)
          buildTagMapping(prayers, data.tags)
        }
      } catch (error) {
        console.error('Error fetching prayers:', error)
        // Fallback to empty array on error
        setFilteredPrayers([])
      } finally {
        setLoading(false)
      }
    }

    fetchPrayers()
  }, [selectedLang])

  // Get prayer by slug
  const getPrayerBySlug = async (slug: string): Promise<PrayerEntry | null> => {
    try {
      // First check if prayer is in current list
      const prayerFromList = filteredPrayers.find(prayer => {
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
  const groupedPrayers: GroupedPrayers = filteredPrayers.reduce((acc, prayer) => {
    if (!prayer.fields.tags) {
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading prayers...</p>
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
                currentLang={selectedLang}
                onLanguageChange={setSelectedLang}
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
                  {(() => {
                    let body = selectedPrayer?.fields?.body

                    if (!body) {
                      return <p>No content available for this prayer.</p>
                    }

                    // Handle both string (from cache) and object (from API) formats
                    if (typeof body === 'string') {
                      try {
                        body = JSON.parse(body)
                      } catch (parseError) {
                        console.error('Failed to parse body JSON:', parseError)
                        return <p>Content format is corrupted.</p>
                      }
                    }

                    if (typeof body !== 'object' || !body) {
                      return <p>Content format is not supported.</p>
                    }

                    try {
                      return documentToReactComponents(body as Document, richTextOptions)
                    } catch (error) {
                      console.error('Error rendering prayer content:', error)
                      return <p>Unable to display prayer content. Please try again.</p>
                    }
                  })()}
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
                Object.entries(groupedPrayers).map(([tagName, prayers]) => (
                  <div key={tagName} className="prayer-group">
                    <h2 className="group-title">{tagName}</h2>
                    <div className="prayer-cards">
                      {prayers.map((prayer) => (
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
