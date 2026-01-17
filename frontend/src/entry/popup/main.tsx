import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../index.css'
// import App from './App.tsx'
import { PopupApp } from './PopupApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
)
