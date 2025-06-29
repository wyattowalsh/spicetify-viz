import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';
import { AISearchTrigger } from '@/components/ai';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions}
      nav={{
        ...baseOptions.nav,
        children: (
          <AISearchTrigger className="max-lg:hidden ms-auto h-9 w-9 p-2 text-muted-foreground" />
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
