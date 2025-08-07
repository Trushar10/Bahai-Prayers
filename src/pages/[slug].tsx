// pages/[slug].tsx

import { GetStaticPaths, GetStaticProps } from 'next'
import { Entry, EntrySkeletonType, EntryFieldTypes } from 'contentful'
import { client } from '../lib/contentful'
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import Head from 'next/head'
import { Document } from '@contentful/rich-text-types'

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text
  slug: EntryFieldTypes.Text
  body: EntryFieldTypes.RichText
}>

type PrayerEntry = Entry<PrayerSkeleton>

// Static paths for all slugs
export const getStaticPaths: GetStaticPaths = async () => {
  const res = await client.getEntries<PrayerSkeleton>({
    content_type: 'prayer',
  })

  const paths = res.items.map((item) => ({
    params: { slug: item.fields.slug },
  }))

  return {
    paths,
    fallback: false, // change to 'blocking' if needed for dynamic fallback
  }
}

// Static props for each page
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const res = await client.getEntries<PrayerSkeleton>({
    content_type: 'prayer',
    'fields.slug': params?.slug as string,
  })

  if (!res.items.length) {
    return { notFound: true }
  }

  return {
    props: {
      prayer: res.items[0] as PrayerEntry,
    },
    revalidate: 60, // Optional: re-generate in background after 60s
  }
}

export default function PrayerPage({ prayer }: { prayer: PrayerEntry }) {
  return (
    <>
      <Head>
        <title>{typeof prayer.fields.title === 'string' ? prayer.fields.title : 'Prayer'}</title>
        <meta name="theme-color" content="#317EFB" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/profile-circle.webp" />
      </Head>

      <main className="text-white p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          {typeof prayer.fields.title === 'string' ? prayer.fields.title : 'Prayer'}
        </h1>
        <div>
          {documentToReactComponents(prayer.fields.body as Document)}
        </div>
      </main>
    </>
  )
}
