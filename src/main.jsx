import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './styles/animations.css'
import { UserProvider } from './UserContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => {
        console.warn('Service worker registration failed:', error)
      })
  })
}
