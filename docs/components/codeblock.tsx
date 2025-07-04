'use client';
import { Check, Copy } from 'lucide-react';
import {
  type ComponentProps,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useRef,
} from 'react';
import { cn } from '../lib/cn';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { buttonVariants } from './ui/button';

export type CodeBlockProps = HTMLAttributes<HTMLElement> & {
  /**
   * Icon of code block
   *
   * When passed as a string, it assumes the value is the HTML of icon
   */
  icon?: ReactNode;

  /**
   * Allow to copy code with copy button
   *
   * @defaultValue true
   */
  allowCopy?: boolean;

  /**
   * Keep original background color generated by Shiki or Rehype Code
   *
   * @defaultValue false
   */
  keepBackground?: boolean;

  viewportProps?: HTMLAttributes<HTMLElement>;

  /**
   * show line numbers
   */
  'data-line-numbers'?: boolean;

  /**
   * @defaultValue 1
   */
  'data-line-numbers-start'?: number;
};

export const Pre = forwardRef<HTMLPreElement, HTMLAttributes<HTMLPreElement>>(
  ({ className, ...props }, ref) => {
    return (
      <pre
        ref={ref}
        className={cn('min-w-full w-max *:flex *:flex-col', className)}
        {...props}
      >
        {props.children}
      </pre>
    );
  },
);

Pre.displayName = 'Pre';

export const CodeBlock = forwardRef<HTMLElement, CodeBlockProps>(
  (
    {
      title,
      allowCopy = true,
      keepBackground = false,
      icon,
      viewportProps,
      children,
      ...props
    },
    ref,
  ) => {
    const areaRef = useRef<HTMLDivElement>(null);
    const onCopy = () => {
      const pre = areaRef.current?.getElementsByTagName('pre').item(0);
      if (!pre) return;

      const clone = pre.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.nd-copy-ignore').forEach((node) => {
        node.replaceWith('\n');
      });

      void navigator.clipboard.writeText(clone.textContent ?? '');
    };

    return (
      <figure
        ref={ref}
        dir="ltr"
        {...props}
        className={cn(
          'not-prose group relative my-4 overflow-hidden rounded-lg border bg-fd-card text-sm outline-none',
          keepBackground && 'bg-(--shiki-light-bg) dark:bg-(--shiki-dark-bg)',
          props.className,
        )}
      >
        {title ? (
          <div className="flex items-center gap-2 bg-fd-secondary px-4 py-1.5">
            {icon ? (
              <div
                className="text-fd-muted-foreground [&_svg]:size-3.5"
                dangerouslySetInnerHTML={
                  typeof icon === 'string'
                    ? {
                        __html: icon,
                      }
                    : undefined
                }
              >
                {typeof icon !== 'string' ? icon : null}
              </div>
            ) : null}
            <figcaption className="flex-1 truncate text-fd-muted-foreground">
              {title}
            </figcaption>
            {allowCopy && <CopyButton className="-me-2" onCopy={onCopy} />}
          </div>
        ) : (
          allowCopy && (
            <CopyButton
              className="absolute right-2 top-2 z-[2] backdrop-blur-md"
              onCopy={onCopy}
            />
          )
        )}
        <div
          ref={areaRef}
          {...viewportProps}
          className={cn(
            'text-[13px] py-3.5 overflow-auto [&_.line]:px-4 max-h-[600px] fd-scroll-container',
            props['data-line-numbers'] && '[&_.line]:pl-3',
            viewportProps?.className,
          )}
          style={{
            counterSet: props['data-line-numbers']
              ? `line ${Number(props['data-line-numbers-start'] ?? 1) - 1}`
              : undefined,
            ...viewportProps?.style,
          }}
        >
          {children}
        </div>
      </figure>
    );
  },
);

CodeBlock.displayName = 'CodeBlock';

function CopyButton({
  className,
  onCopy,
  ...props
}: ComponentProps<'button'> & {
  onCopy: () => void;
}) {
  const [checked, onClick] = useCopyButton(onCopy);

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({
          color: 'ghost',
        }),
        'transition-opacity group-hover:opacity-100 [&_svg]:size-3.5',
        !checked && '[@media(hover:hover)]:opacity-0',
        className,
      )}
      aria-label={checked ? 'Copied Text' : 'Copy Text'}
      onClick={onClick}
      {...props}
    >
      <Check className={cn('transition-transform', !checked && 'scale-0')} />
      <Copy
        className={cn('absolute transition-transform', checked && 'scale-0')}
      />
    </button>
  );
}
