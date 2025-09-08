import { GetStaticPaths, GetStaticProps } from 'next';
import { Entry, EntrySkeletonType, EntryFieldTypes } from 'contentful';
import { client } from '../lib/contentful';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Document } from '@contentful/rich-text-types';
import ThemeToggle from '../components/ThemeToggle';
import { useEffect } from 'react';
import { track } from '@vercel/analytics';

// Helper function to clean URL slugs (replace spaces with hyphens)
const cleanUrlSlug = (text: string): string => {
	return text
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/\-\-+/g, '-'); // Replace multiple hyphens with single hyphen
};

type PrayerSkeleton = EntrySkeletonType<{
	title: EntryFieldTypes.Text;
	slug: EntryFieldTypes.Text;
	body: EntryFieldTypes.RichText;
}>;

type PrayerEntry = Entry<PrayerSkeleton>;

export const getStaticPaths: GetStaticPaths = async () => {
	// Fetch all slugs from all supported languages
	const contentTypes = await client.getContentTypes();
	const paths: { params: { slug: string } }[] = [];

	for (const ct of contentTypes.items) {
		if (ct.sys.id.startsWith('prayer-')) {
			const langCode = ct.sys.id.split('-')[1];
			const res = await client.getEntries<PrayerSkeleton>({
				content_type: `prayer-${langCode}`,
				select: ['fields.slug'],
			});

			res.items.forEach((item) => {
				// Clean the original slug for URL use
				const cleanSlug = cleanUrlSlug(item.fields.slug);
				paths.push({ params: { slug: cleanSlug } });
			});
		}
	}

	return {
		paths,
		fallback: false,
	};
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
	const urlSlug = params?.slug as string;

	// Try to find the prayer in any language, defaulting to English
	const languages = ['en', 'hi', 'gu'];
	let matchingPrayer: PrayerEntry | null = null;

	for (const langCode of languages) {
		try {
			const res = await client.getEntries<PrayerSkeleton>({
				content_type: `prayer-${langCode}`,
			});

			// Find prayer where the cleaned slug matches our URL slug
			const prayer = res.items.find((item) => {
				return cleanUrlSlug(item.fields.slug) === urlSlug;
			});

			if (prayer) {
				matchingPrayer = prayer as PrayerEntry;
				break;
			}
		} catch {
			// Continue to next language if this one fails
			continue;
		}
	}

	if (!matchingPrayer) {
		return { notFound: true };
	}

	return {
		props: {
			prayer: matchingPrayer,
		},
		revalidate: 60,
	};
};

export default function PrayerPage({ prayer }: { prayer: PrayerEntry }) {
	const router = useRouter();

	// Track page views for individual prayer pages
	useEffect(() => {
		if (prayer && prayer.fields.title) {
			track('prayer_page_view', {
				prayer_title: typeof prayer.fields.title === 'string' ? prayer.fields.title : 'Unknown Prayer',
				prayer_slug: router.asPath,
			});
		}
	}, [prayer, router.asPath]);

	if (!prayer) {
		return (
			<>
				<Head>
					<title>Prayer Not Found</title>
					<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
					<meta name="theme-color" content="#667eea" />
				</Head>
				<div className="app">
					<div className="nav-header">
						<div className="nav-content">
							<div className="nav-left">
								<button className="nav-btn back-btn" onClick={() => router.back()}>
									<svg
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<polyline points="15,18 9,12 15,6"></polyline>
									</svg>
								</button>
								<div className="logo">
									<svg
										width="28"
										height="28"
										viewBox="0 0 24 24"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M12 2L3 9h3v9h12v-9h3L12 2zm0 3.5L16.5 9H15v7H9V9H7.5L12 5.5z"
											fill="currentColor"
										/>
									</svg>
									<h1 className="app-title">Prayer Not Found</h1>
								</div>
							</div>
						</div>
					</div>
					<div className="page-content">
						<div className="prayer-detail">
							<div className="prayer-header">
								<h1 className="prayer-detail-title">Prayer Not Available</h1>
								<div className="prayer-detail-meta">Error</div>
							</div>
							<div className="prayer-content">
								<div className="prayer-text">
									<p>The requested prayer could not be found.</p>
								</div>
							</div>
						</div>
					</div>
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
				<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
				<meta name="theme-color" content="#667eea" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="Prayers" />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
				<link
					href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
					rel="stylesheet"
				/>
				<link rel="manifest" href="/manifest.json" />
				<link rel="icon" href="/favicon.ico?v=2" />
			</Head>

			<div className="app">
				<div className="nav-header">
					<div className="nav-content">
						<div className="nav-left">
							<button className="nav-btn back-btn" onClick={() => router.back()}>
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="15,18 9,12 15,6"></polyline>
								</svg>
							</button>
							<div className="logo">
								<svg
									width="28"
									height="28"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M12 2L3 9h3v9h12v-9h3L12 2zm0 3.5L16.5 9H15v7H9V9H7.5L12 5.5z"
										fill="currentColor"
									/>
								</svg>
								<h1 className="app-title">Prayers</h1>
							</div>
						</div>
						<div className="nav-right">
							<ThemeToggle />
						</div>
					</div>
				</div>

				<div className="page-content">
					<div className="prayer-detail">
						<div className="prayer-header">
							<h1 className="prayer-detail-title">
								{typeof prayer.fields.title === 'string'
									? prayer.fields.title
									: 'Prayer'}
							</h1>
						</div>
						<div className="prayer-content">
							<div className="prayer-text">
								{documentToReactComponents(
									prayer.fields.body as Document
								)}
							</div>
						</div>
						<div className="action-buttons">
							<button 
								className="action-btn" 
								onClick={() => {
									if (navigator.share) {
										navigator.share({
											title: typeof prayer.fields.title === 'string' ? prayer.fields.title : 'Prayer',
											text: prayer.fields.body?.toString() || '',
											url: window.location.href,
										}).catch(console.error);
									}
								}}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
									<path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
								</svg>
								Share
							</button>
							<button 
								className="action-btn primary" 
								onClick={() => {
									const text = `${typeof prayer.fields.title === 'string' ? prayer.fields.title : 'Prayer'}\n\n${prayer.fields.body?.toString() || ''}`;
									navigator.clipboard.writeText(text).then(() => {
										console.log('Prayer copied to clipboard');
									}).catch(console.error);
								}}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
									<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
								</svg>
								Copy
							</button>
						</div>
					</div>
				</div>

				<div className="bottom-safe-area"></div>
			</div>
		</>
	);
}
