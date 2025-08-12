import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// Language-specific home page handler
// This handles URLs like /hi, /gu, etc.

export const getStaticPaths: GetStaticPaths = async () => {
  // Define supported languages (English now also uses this route for prayer pages)
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

  return {
    props: {
      lang
    },
    revalidate: 60
  };
};

interface Props {
  lang: string;
}

export default function LanguageHomePage({ lang }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Redirect to main page with language parameter
    // The main index.tsx will handle the language detection and UI
    if (typeof window !== 'undefined') {
      // Set the language in localStorage
      localStorage.setItem('selectedLang', lang);
      
      // Redirect to main page - it will pick up the language from localStorage
      router.replace('/').then(() => {
        setIsLoading(false);
      });
    }
  }, [lang, router]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading {lang === 'hi' ? 'हिंदी' : lang === 'gu' ? 'ગુજરાતી' : lang === 'en' ? 'English' : lang}...
      </div>
    );
  }

  return null;
}
