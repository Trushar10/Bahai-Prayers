import '@/styles/prayers.css'
import type { AppProps } from 'next/app'
import { Rasa } from 'next/font/google'
import { SpeedInsights } from "@vercel/speed-insights/next"

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
      <SpeedInsights />
    </main>
  )
}
