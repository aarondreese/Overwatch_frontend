import '../styles/globals.css'
import { useEffect } from 'react'

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Initialize Electron API access if available
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('Running in Electron context')
      // You can perform Electron-specific initialization here
    }
  }, [])

  return <Component {...pageProps} />
}

export default MyApp
