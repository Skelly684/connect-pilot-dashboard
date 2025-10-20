import React from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import App from './App.tsx'
import './index.css'
import { DemoProvider } from './contexts/DemoContext'

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <DemoProvider>
      <App />
    </DemoProvider>
  </ThemeProvider>
);
