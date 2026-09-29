import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './lib/theme'

const boot = document.getElementById('boot')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)

// Hand off from the pre-hydration splash once React has painted a frame.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (boot) {
      boot.dataset.done = 'true'
      window.setTimeout(() => boot.remove(), 600)
    }
  })
})
