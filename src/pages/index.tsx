import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  // Check if user has a language preference in cookies
  const cookies = req.headers.cookie || ''
  const langMatch = cookies.match(/selectedLang=([^;]+)/)
  const savedLang = langMatch ? langMatch[1] : null
  
  // Validate saved language and default to 'en'
  const supportedLanguages = ['en', 'hi', 'gu']
  const targetLang = savedLang && supportedLanguages.includes(savedLang) ? savedLang : 'en'
  
  // Server-side redirect to language-specific page
  return {
    redirect: {
      destination: `/${targetLang}`,
      permanent: false,
    },
  }
}

export default function Home() {
  // This component should never render since we always redirect
  return null
}
