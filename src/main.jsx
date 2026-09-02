import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DirectS3UploadProvider } from './context/DirectS3UploadContext.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { GOOGLE_CLIENT_ID } from './config.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <LanguageProvider>
          <DirectS3UploadProvider>
            <App />
          </DirectS3UploadProvider>
        </LanguageProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
