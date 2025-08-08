import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Rasa } from 'next/font/google'

const rasa = Rasa({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-rasa',
  display: 'swap',
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={rasa.variable}>
      <Component {...pageProps} />
    </main>
  )
}
