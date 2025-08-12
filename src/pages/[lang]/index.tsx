import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head'
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful'
import { Document } from '@contentful/rich-text-types'
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { client } from '../../lib/contentful'
import ThemeToggle from '../../components/ThemeToggle'
import LanguageToggle from '../../components/LanguageToggle'

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

// Language-specific home page handler
// This handles URLs like /hi, /gu, /en, etc.

export const getStaticPaths: GetStaticPaths = async () => {
  // Define supported languages
  const languages = ['en', 'hi', 'gu'];
  
  const paths = languages.map((lang) => ({
    params: { lang }
  }));

  return {
    paths,
    fallback: false // 404 for unsupported languages
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const lang = params?.lang as string;
  
  // Validate language
  const supportedLanguages = ['en', 'hi', 'gu'];
  if (!supportedLanguages.includes(lang)) {
    return {
      notFound: true
    };
  }

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

  // Fetch prayers for the specific language
  const res = await client.getEntries<PrayerSkeleton>({
    content_type: `prayer-${lang}`,
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
      lang
    },
    revalidate: 60
  };
};

interface Props {
  prayers: PrayerEntry[];
  languages: { code: string; name: string }[];
  lang: string;
}

export default function LanguageHomePage({ prayers, languages, lang }: Props) {
  const router = useRouter();
  
  // State to hold tag ID to name mapping
  const [tagNames, setTagNames] = useState<{ [id: string]: string }>({})
  
  const [selectedLang, setSelectedLang] = useState(lang)
  const [filteredPrayers, setFilteredPrayers] = useState<Array<PrayerEntry>>(prayers || [])
  const [currentView, setCurrentView] = useState<'home' | 'prayer'>('home')
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerEntry | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Update localStorage when language changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLang', lang)
    }
    setSelectedLang(lang)
  }, [lang])

  // Handle language change with URL update
  const handleLanguageChange = (newLang: string) => {
    setSelectedLang(newLang)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLang', newLang)
      
      // Navigate to new language route
      const newUrl = currentView === 'home' 
        ? `/${newLang}`
        : `/${newLang}/${selectedPrayer?.fields.slug || ''}`
      
      router.push(newUrl)
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
      
      // Create URL based on language
      const prayerUrl = `/${selectedLang}/${urlSlug}`
      
      // Navigate to prayer page
      router.push(prayerUrl)
      
      // Scroll to top instantly so user can read from the beginning
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }, 100)
    }
    
    // Small delay to ensure state updates before animation ends
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleBack = () => {
    if (isAnimating) return
    
    setIsAnimating(true)
    
    setCurrentView('home')
    
    // Navigate back to language home
    router.push(`/${selectedLang}`)
    
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
