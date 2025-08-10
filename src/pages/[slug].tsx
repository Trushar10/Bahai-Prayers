import { GetStaticPaths, GetStaticProps } from 'next';
import { Entry, EntrySkeletonType, EntryFieldTypes, EntrySys } from 'contentful';
import { client } from '../lib/contentful';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Document } from '@contentful/rich-text-types';
import ThemeToggle from '../components/ThemeToggle';
import { useEffect, useState } from 'react';

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Text;
  body: EntryFieldTypes.RichText;
}>;

type PrayerEntry = Entry<PrayerSkeleton>;

type CachedPrayer = {
  fields: {
    title: string;
    slug: string;
    body: string | Document | Record<string, unknown>;
  };
  sys: EntrySys;
  metadata?: Record<string, unknown>;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const res = await client.getEntries<PrayerSkeleton>({
    content_type: 'prayer-eng',
    select: ['fields.slug'],
  });

  const paths = res.items.map((item) => ({
    params: { slug: item.fields.slug },
  }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const res = await client.getEntries<PrayerSkeleton>({
    content_type: 'prayer-eng',
    'fields.slug': params?.slug as string,
  });

  if (!res.items.length) {
    return { notFound: true };
  }

  return {
    props: {
      prayer: res.items[0] as PrayerEntry,
    },
    revalidate: 60,
  };
};

export default function PrayerPage({ prayer: initialPrayer }: { prayer: PrayerEntry }) {
  const router = useRouter();
  const [prayer, setPrayer] = useState<PrayerEntry | CachedPrayer | null>(initialPrayer);
  const [isOffline, setIsOffline] = useState(false);
  const { slug } = router.query;

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    async function loadData() {
      if (typeof slug !== 'string') return;

      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/prayer/${slug}`);
          if (res.ok) {
            const latest = await res.json();
            setPrayer(latest);
            return;
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch from API online:', err);
        }
      }

      // Try IndexedDB
      const fromIDB = await loadPrayerFromCache(slug);
      if (fromIDB) {
        setPrayer(fromIDB);
        return;
      }

      // Try SW API cache
      const fromApiCache = await loadPrayerFromApiCache(slug);
      if (fromApiCache) {
        setPrayer(fromApiCache);
      }
    }

    loadData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [slug]);

  if (!prayer) {
    return (
      <>
        <Head>
          <title>Prayer Not Found</title>
        </Head>
        <div className="container">
          <header className="header">
            <div className="header-content">
              <button className="back-btn" onClick={() => router.back()}>
                ← Back
              </button>
              <div className="title">Prayer Not Found</div>
              <ThemeToggle />
            </div>
          </header>
          <main className="single-post">
            <div className="post-content">
              <h1>Prayer Not Available</h1>
              <p>
                {isOffline
                  ? "This prayer is not available offline. Please connect to the internet and try again."
                  : "The requested prayer could not be found."}
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

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
        {isOffline && (
          <div style={{
            backgroundColor: '#f39c12',
            color: 'white',
            padding: '8px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            📱 Viewing offline content
          </div>
        )}

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

async function loadPrayerFromCache(slug: string): Promise<CachedPrayer | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('PrayersDB', 1);
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['prayers'], 'readonly');
      const store = tx.objectStore('prayers');
      const getReq = store.get(slug);
      getReq.onsuccess = () => {
        const result = getReq.result;
        if (result) {
          resolve({
            fields: {
              title: result.title,
              slug: result.slug,
              body: result.body,
            },
            sys: result.sys,
            metadata: result.metadata,
          });
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
    };
  });
}

async function loadPrayerFromApiCache(slug: string): Promise<CachedPrayer | null> {
  try {
    const cache = await caches.open('next-api-cache');
    const cachedResponse = await cache.match(`/api/prayer/${slug}`);
    if (!cachedResponse) return null;
    const json = await cachedResponse.json();
    return json;
  } catch (err) {
    console.warn('⚠️ Failed to load from API cache:', err);
    return null;
  }
}
