import { docs } from '@/.source';
import { loader } from 'fumadocs-core/source';
import { createElement } from 'react';
import { icons as lucideIcons, type LucideIcon } from 'lucide-react';

// Statically import all major react-icon sets to create a master icon object.
// This is a robust approach that avoids dynamic `require` and works well with bundlers.
import * as Ai from 'react-icons/ai';
import * as Bs from 'react-icons/bs';
import * as Di from 'react-icons/di';
import * as Fi from 'react-icons/fi';
import * as Fc from 'react-icons/fc';
import * as Fa from 'react-icons/fa';
import * as Fa6 from 'react-icons/fa6';
import * as Gi from 'react-icons/gi';
import * as Go from 'react-icons/go';
import * as Gr from 'react-icons/gr';
import * as Hi from 'react-icons/hi';
import * as Im from 'react-icons/im';
import * as Io from 'react-icons/io';
import * as Io5 from 'react-icons/io5';
import * as Lu from 'react-icons/lu';
import * as Md from 'react-icons/md';
import * as Pi from 'react-icons/pi';
import * as Ri from 'react-icons/ri';
import * as Si from 'react-icons/si';
import * as Sl from 'react-icons/sl';
import * as Tb from 'react-icons/tb';
import * as Tfi from 'react-icons/tfi';
import * as Ti from 'react-icons/ti';
import * as Vsc from 'react-icons/vsc';
import * as Wi from 'react-icons/wi';

const allReactIcons = {
  ...Ai, ...Bs, ...Di, ...Fi, ...Fc, ...Fa, ...Fa6, ...Gi, ...Go, ...Gr,
  ...Hi, ...Im, ...Io, ...Io5, ...Lu, ...Md, ...Pi, ...Ri, ...Si, ...Sl,
  ...Tb, ...Tfi, ...Ti, ...Vsc, ...Wi,
} as Record<string, LucideIcon>;

// See https://fumadocs.vercel.app/docs/headless/source-api for more info
export const source = loader({
  // it assigns a URL to your pages
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  icon(icon) {
    if (!icon) return;

    // 1. Check lucide-react first for performance
    if (icon in lucideIcons) {
      return createElement(lucideIcons[icon as keyof typeof lucideIcons]);
    }

    // 2. Fallback to the master react-icons object
    if (icon in allReactIcons) {
      return createElement(allReactIcons[icon]);
    }
  },
});
