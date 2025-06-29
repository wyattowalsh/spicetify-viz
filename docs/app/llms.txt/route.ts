import { source } from '@/lib/source';
import { type PageTree } from 'fumadocs-core/server';
import { type InferPageType } from 'fumadocs-core/source';

function generateMarkdownLinkList(
  items: PageTree.Node[],
  pageMap: Map<string, InferPageType<typeof source>>,
  level = 0,
): string {
  let list = '';

  for (const item of items) {
    const prefix = '  '.repeat(level);

    if (item.type === 'page') {
      const page = pageMap.get(item.url);
      const description = page?.data.description
        ? `: ${page.data.description}`
        : '';
      list += `${prefix}- [${item.name}](${item.url})${description}\n`;
    } else if (item.type === 'folder') {
      if (item.index) {
        const page = pageMap.get(item.index.url);
        const description = page?.data.description
          ? `: ${page.data.description}`
          : '';
        list += `${prefix}- [${item.name}](${item.index.url})${description}\n`;
      } else {
        list += `${prefix}- ${item.name}\n`;
      }

      if (item.children.length > 0) {
        list += generateMarkdownLinkList(item.children, pageMap, level + 1);
      }
    }
  }

  return list;
}

// cached forever
export const revalidate = false;

export async function GET() {
  const allPages = source.getPages();
  const pageMap = new Map(allPages.map((p) => [p.url, p]));
  const linkList = generateMarkdownLinkList(source.pageTree.children, pageMap);

  const body = `# ${source.pageTree.name}\n\n${linkList}`;

  return new Response(body);
} 