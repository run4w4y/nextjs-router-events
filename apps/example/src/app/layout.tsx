import type { Metadata } from 'next'
import { Suspense, type ReactNode } from 'react'
import './globals.css'
import { RouteChangesProvider } from 'nextjs-router-events'
import { ExampleShell } from './_lib/example-shell'

export const metadata: Metadata = {
  title: 'nextjs-router-events Todo Demo',
  description:
    'A hosted-ready demo for nextjs-router-events with guarded drafts and route progress.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Suspense fallback={<div />}>
          <RouteChangesProvider>
            <ExampleShell>{children}</ExampleShell>
          </RouteChangesProvider>
        </Suspense>
      </body>
    </html>
  )
}
