import type { BaseLayoutProps } from 'fumadocs-ui/layout';
import Image from 'next/image';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <Image
          src="/img/icon-light.png"
          alt="spicetify-viz Logo"
          width={24}
          height={24}
          className="dark:hidden"
        />
        <Image
          src="/img/icon-dark.png"
          alt="spicetify-viz Logo"
          width={24}
          height={24}
          className="hidden dark:block"
        />
        <h2 className="text-xl font-bold">spicetify-viz</h2>
      </>
    ),
  },
  // see https://fumadocs.dev/docs/ui/navigation/links
  links: [],
};
