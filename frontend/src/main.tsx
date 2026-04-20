import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from './context/theme-provider'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import App from './App'
import './styles/index.css'

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <App />
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </StrictMode>
  )
}
