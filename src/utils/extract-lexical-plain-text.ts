const PREVIEW_MAX_LENGTH = 140;

const collectLexicalText = (node: unknown, texts: string[]) => {
  if (!node || typeof node !== 'object') {
    return;
  }

  const record = node as Record<string, unknown>;

  if (typeof record.text === 'string' && record.text.trim()) {
    texts.push(record.text);
  }

  if (record.root) {
    collectLexicalText(record.root, texts);
  }

  if (Array.isArray(record.children)) {
    for (const child of record.children) {
      collectLexicalText(child, texts);
    }
  }
};

export const extractLexicalPlainText = (
  content: unknown,
  maxLength = PREVIEW_MAX_LENGTH,
): string => {
  const texts: string[] = [];
  collectLexicalText(content, texts);

  const text = texts.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}…`;
};
