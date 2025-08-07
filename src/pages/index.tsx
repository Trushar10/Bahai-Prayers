// pages/index.tsx

import { GetStaticProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { Entry, EntrySkeletonType, EntryFieldTypes } from 'contentful'
import { client } from '../lib/contentful'

// 1. Define the Contentful skeleton
type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text
  slug: EntryFieldTypes.Text
  body: EntryFieldTypes.RichText
}>

// 2. Typed Entry
type PrayerEntry = Entry<PrayerSkeleton>

// 3. Static Props for build-time rendering
export const getStaticProps: GetStaticProps = async () => {
  const res = await client.getEntries<PrayerSkeleton>({
    content_type: 'prayer',
  })

  return {
    props: {
      prayers: res.items as PrayerEntry[],
    },
    revalidate: 60, // ISR: update after 60s (optional)
  }
}

// 4. Main Component
export default function Home({ prayers }: { prayers: PrayerEntry[] }) {
  return (
    <>
      <Head>
        <title>Prayers</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/profile-circle.webp" />
        <meta name="theme-color" content="#317EFB" />
      </Head>

      <main className="p-6 max-w-3xl mx-auto text-white">
        <h1 className="text-3xl font-bold mb-6">Prayers</h1>
        <ul className="space-y-4">
          {prayers.map((p) => (
            <li key={p.sys.id}>
              <Link href={`/${p.fields.slug}`} className="text-blue-400 hover:underline">
                {typeof p.fields.title === 'string' ? p.fields.title : 'Untitled'}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
