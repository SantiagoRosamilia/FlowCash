import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FlowCash from './FlowCash.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FlowCash />
  </StrictMode>
)
