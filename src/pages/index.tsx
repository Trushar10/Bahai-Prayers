import Head from 'next/head'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import { Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful'
import { client } from '../lib/contentful'
import Compass from '@/components/Compass'

// 1. Define Contentful Schema
type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text
  slug: EntryFieldTypes.Text
  body: EntryFieldTypes.RichText
}>

type PrayerEntry = Entry<PrayerSkeleton>

// 2. Static Props
export const getStaticProps: GetStaticProps = async () => {
  const res = await client.getEntries<PrayerSkeleton>({ content_type: 'prayer' })

  return {
    props: {
      prayers: res.items as PrayerEntry[],
    },
    revalidate: 60, // Optional: Rebuild every 60s
  }
}

// 3. Home Page Component
export default function Home({ prayers }: { prayers: PrayerEntry[] }) {
  return (
    <>
      <Head>
        <title>Prayers</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/profile-circle.webp" />
        <meta name="theme-color" content="#317EFB" />
      </Head>

      <main className="min-h-screen flex flex-col items-center px-4 pt-20 text-white">
        {/* Header with title and compass */}
        <header className="flex items-center justify-center gap-4 mb-10">
          <Link href="/">
            <h1 className="text-3xl font-bold text-center">Prayers</h1>
          </Link>
          <div className="w-8 h-8">
            <Compass />
          </div>
        </header>

        {/* Post List */}
        <ul className="space-y-4 w-full max-w-xl">
          {prayers.map((p) => (
            <li key={p.sys.id} className="text-center">
              <Link
                href={`/${p.fields.slug}`}
                className="text-blue-400 hover:underline text-lg"
              >
                {typeof p.fields.title === 'string' ? p.fields.title : 'Untitled'}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
