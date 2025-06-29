import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Mermaid } from "@/components/mdx/mermaid";
import {
	CodeBlock,
	type CodeBlockProps,
} from "fumadocs-ui/components/codeblock";
import { Steps } from "fumadocs-ui/components/steps";

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Mermaid,
    CodeBlock,
    Steps,
    ...components,
  };
}
