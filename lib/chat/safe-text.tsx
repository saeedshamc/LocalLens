import type { ReactNode } from 'react';

/** Escape and lightly format model output without using innerHTML. */
export function renderSafeChatText(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => (
    <span key={`l-${lineIndex}`}>
      {renderInline(line)}
      {lineIndex < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function renderInline(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > last) {
      nodes.push(line.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`c-${key++}`}
          className="rounded bg-[var(--ll-bg)] px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <strong key={`b-${key++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    }
    last = match.index + token.length;
  }

  if (last < line.length) nodes.push(line.slice(last));
  if (nodes.length === 0) nodes.push(line);
  return nodes;
}
