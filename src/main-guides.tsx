import React from 'react'
import ReactDOM from 'react-dom/client'
import GuidesApp from './GuidesApp.tsx'
import GlobalErrorBoundary from './components/GlobalErrorBoundary'
import './styles/globals.css'
import './i18n';

import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GlobalErrorBoundary>
            <HelmetProvider>
                <BrowserRouter>
                    <GuidesApp />
                </BrowserRouter>
            </HelmetProvider>
        </GlobalErrorBoundary>
    </React.StrictMode>,
)
