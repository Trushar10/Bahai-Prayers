// pages/[slug].tsx
import { GetStaticPaths, GetStaticProps } from 'next';
import { Entry, EntrySkeletonType, EntryFieldTypes } from 'contentful';
import { client } from '../lib/contentful';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Document } from '@contentful/rich-text-types';
import ThemeToggle from '../components/ThemeToggle';
import { useEffect } from 'react';

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Text;
  body: EntryFieldTypes.RichText;
}>;

type PrayerEntry = Entry<PrayerSkeleton>;

// Fetch paths for all prayers
export const getStaticPaths: GetStaticPaths = async () => {
  const res = await client.getEntries<PrayerSkeleton>({
    content_type: 'prayer-eng',
    select: ['fields.slug'], // ✅ FIX: array instead of string
  });

  const paths = res.items.map((item) => ({
    params: { slug: item.fields.slug },
  }));

  return {
    paths,
    fallback: false,
  };
};

// Fetch data for a single prayer
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const res = await client.getEntries<PrayerSkeleton>({
    content_type: 'prayer-eng',
    'fields.slug': params?.slug as string,
  });

  if (!res.items.length) {
    return { notFound: true };
  }

  // Fetch all slugs for pre-caching later
  const allPrayers = await client.getEntries<PrayerSkeleton>({
    content_type: 'prayer-eng',
    select: ['fields.slug'],
  });

  return {
    props: {
      prayer: res.items[0] as PrayerEntry,
      allSlugs: allPrayers.items.map((p) => p.fields.slug),
    },
    revalidate: 60,
  };
};

export default function PrayerPage({
  prayer,
  allSlugs,
}: {
  prayer: PrayerEntry;
  allSlugs: string[];
}) {
  const router = useRouter();

  // ✅ Pre-cache all prayer pages for offline use
  useEffect(() => {
    if ('serviceWorker' in navigator && allSlugs?.length) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({
          type: 'PRECACHE_PAGES',
          payload: allSlugs.map((slug) => `/${slug}`),
        });
      });
    }
  }, [allSlugs]);

  return (
    <>
      <Head>
        <title>
          {typeof prayer.fields.title === 'string'
            ? prayer.fields.title
            : 'Prayer'}
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#317EFB" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/profile-circle.webp" />
      </Head>

      <div className="container show-single-post">
        <header className="header">
          <div className="header-content">
            <button className="back-btn" onClick={() => router.back()}>
              ← Back
            </button>
            <div className="title">
              {typeof prayer.fields.title === 'string'
                ? prayer.fields.title
                : 'Prayer'}
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="single-post">
          <article className="post-content">
            <h1>
              {typeof prayer.fields.title === 'string'
                ? prayer.fields.title
                : 'Prayer'}
            </h1>
            <div className="content">
              {documentToReactComponents(prayer.fields.body as Document)}
            </div>
          </article>
        </main>
      </div>
    </>
  );
}
