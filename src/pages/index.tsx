// pages/index.tsx

import { GetStaticProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { Entry, EntrySkeletonType, EntryFieldTypes } from 'contentful'
import { client } from '../lib/contentful'


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
  }
}

export default function Home({ prayers }: { prayers: PrayerEntry[] }) {
  return (
    <>
      <Head>
        <meta name="theme-color" content="#0f1624" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
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
