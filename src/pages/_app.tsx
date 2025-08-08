import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Rasa } from 'next/font/google'

const rasa = Rasa({
  subsets: ['latin'],
  weight: ['400', '600', '700'], // Add weights you need
  variable: '--font-rasa',       // Use CSS variable
  display: 'swap',
})


export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
