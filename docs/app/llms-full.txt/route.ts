import { source } from '@/lib/source';
import { getLLMText } from '@/lib/get-llm-text';
import { type PageTree } from 'fumadocs-core/server';
import { type InferPageType } from 'fumadocs-core/source';

function getOrderedPages(): InferPageType<typeof source>[] {
  const allPages = source.getPages();
  const pageMap = new Map(allPages.map((p) => [p.url, p]));
  const orderedPages: InferPageType<typeof source>[] = [];

  function traverse(items: PageTree.Node[]) {
    for (const item of items) {
      if (item.type === 'folder') {
        if (item.index) {
          const page = pageMap.get(item.index.url);
          if (page) orderedPages.push(page);
        }
        traverse(item.children);
      } else if (item.type === 'page') {
        const page = pageMap.get(item.url);
        if (page) orderedPages.push(page);
      }
    }
  }

  traverse(source.pageTree.children);
  return orderedPages;
}

function generateStructureSummary(tree: PageTree.Root): string {
  let summary = '## Documentation Structure\n\n';

  function traverse(items: PageTree.Node[], level = 0) {
    for (const item of items) {
      const prefix = '  '.repeat(level);
      if (item.type === 'folder') {
        const folderName = item.index ? item.index.name : item.name;
        summary += `${prefix}- 📁 ${folderName}\n`;
        traverse(item.children, level + 1);
      } else if (item.type === 'page') {
        summary += `${prefix}- 📄 ${item.name}\n`;
      } else if (item.type === 'separator') {
        summary += `${prefix}--- (Separator)\n`;
      }
    }
  }

  traverse(tree.children);
  return summary;
}

// cached forever
export const revalidate = false;

export async function GET() {
  const structureSummary = generateStructureSummary(source.pageTree);
  const orderedPages = getOrderedPages();
  const pageContents = await Promise.all(orderedPages.map(getLLMText));

  const fullContent = pageContents.join('');
  const charCount = fullContent.length;
  const tokenCount = Math.round(charCount / 4); // Simple estimation
  const pageCount = orderedPages.length;

  const header = `# Spicetify-Viz Documentation for LLMs

This document contains the full documentation for Spicetify-Viz, formatted for consumption by Large Language Models.
It begins with a summary of the documentation structure, followed by the full content of each page, in order.

## Metadata
- Page Count: ${pageCount}
- Estimated Character Count: ${charCount}
- Estimated Token Count: ${tokenCount}
`;

  const body = [header, structureSummary, ...pageContents].join(
    '\n\n---\n\n',
  );

  return new Response(body);
} 