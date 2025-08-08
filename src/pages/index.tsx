import Head from 'next/head'
import { GetStaticProps } from 'next'
import { Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful'
import { client } from '../lib/contentful'
import { useRouter } from 'next/router'
import ThemeToggle from '../components/ThemeToggle'


type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text
  slug: EntryFieldTypes.Text
  body: EntryFieldTypes.RichText
}>

type PrayerEntry = Entry<PrayerSkeleton>

export const getStaticProps: GetStaticProps = async () => {
  const res = await client.getEntries<PrayerSkeleton>({ content_type: 'prayer' })

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

  return (
    <>
      <Head>
        <title>Prayers</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/profile-circle.webp" />
        <meta name="theme-color" content="#317EFB" />
      </Head>

      <header className="header">
        <div className="header-content">
          <div className="title">Prayers</div>          
          <ThemeToggle />
        </div>
      </header>

      <div className="container">
        <main className="homepage">
          <div className="post-list">
            {prayers.map((p) => (
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
                  if (e.key === 'Enter') if (typeof p.fields.slug === 'string') {
                    handleClick(p.fields.slug)
                  }
                }}
              >
               <h3>{typeof p.fields.title === 'string' ? p.fields.title : 'Untitled'}</h3>

              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}
