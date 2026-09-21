type FormatMode = 'html' | 'markdown';

const IS_BOLD = 1;
const IS_ITALIC = 2;
const IS_STRIKETHROUGH = 4;
const IS_UNDERLINE = 8;
const IS_CODE = 16;

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeMarkdown = (text: string) => text.replace(/([\\_*`~|[\]])/g, '\\$1');

const escapeText = (text: string, mode: FormatMode) =>
  mode === 'html' ? escapeHtml(text) : escapeMarkdown(text);

const wrapFormatted = (text: string, format: number, mode: FormatMode) => {
  if (!text) {
    return '';
  }

  let result = text;

  if (format & IS_CODE) {
    result = mode === 'html' ? `<code>${result}</code>` : `\`${result.replace(/`/g, '')}\``;
  }
  if (format & IS_BOLD) {
    result = mode === 'html' ? `<b>${result}</b>` : `**${result}**`;
  }
  if (format & IS_ITALIC) {
    result = mode === 'html' ? `<i>${result}</i>` : `*${result}*`;
  }
  if (format & IS_UNDERLINE) {
    result = mode === 'html' ? `<u>${result}</u>` : `__${result}__`;
  }
  if (format & IS_STRIKETHROUGH) {
    result = mode === 'html' ? `<s>${result}</s>` : `~~${result}~~`;
  }

  return result;
};

type SerializeState = {
  mode: FormatMode;
  maxLength: number;
  plainLength: number;
  truncated: boolean;
  listCounters: number[];
};

const takePlain = (state: SerializeState, text: string) => {
  if (state.truncated || !text) {
    return '';
  }

  const remaining = state.maxLength - state.plainLength;
  if (remaining <= 0) {
    state.truncated = true;
    return '';
  }

  if (text.length <= remaining) {
    state.plainLength += text.length;
    return text;
  }

  state.plainLength = state.maxLength;
  state.truncated = true;
  return `${text.slice(0, remaining).trimEnd()}…`;
};

const getNodeType = (node: Record<string, unknown>) =>
  typeof node.type === 'string' ? node.type : null;

const getChildren = (node: Record<string, unknown>) =>
  Array.isArray(node.children) ? (node.children as unknown[]) : [];

const serializeChildren = (nodes: unknown[], state: SerializeState): string => {
  const parts: string[] = [];
  for (const child of nodes) {
    if (state.truncated) {
      break;
    }
    const part = serializeNode(child, state);
    if (part) {
      parts.push(part);
    }
  }
  return parts.join('');
};

const serializeText = (node: Record<string, unknown>, state: SerializeState) => {
  const raw = typeof node.text === 'string' ? node.text : '';
  const sliced = takePlain(state, raw);
  if (!sliced) {
    return '';
  }

  const format = typeof node.format === 'number' ? node.format : 0;
  return wrapFormatted(escapeText(sliced, state.mode), format, state.mode);
};

const serializeLink = (node: Record<string, unknown>, state: SerializeState) => {
  const url = typeof node.url === 'string' ? node.url.trim() : '';
  const label = serializeChildren(getChildren(node), state) || escapeText(url, state.mode);
  if (!url || !label) {
    return label;
  }

  if (state.mode === 'html') {
    return `<a href="${escapeHtml(url)}">${label}</a>`;
  }

  return `[${label}](${url})`;
};

const serializeListItem = (node: Record<string, unknown>, state: SerializeState) => {
  const content = serializeChildren(getChildren(node), state).trim();
  if (!content) {
    return '';
  }

  const depth = state.listCounters.length;
  const indent = '  '.repeat(Math.max(0, depth - 1));
  const counter = state.listCounters[depth - 1] ?? 0;

  if (counter > 0) {
    state.listCounters[depth - 1] = counter + 1;
    return `${indent}${counter}. ${content}`;
  }

  return `${indent}• ${content}`;
};

const serializeList = (node: Record<string, unknown>, state: SerializeState) => {
  const ordered = getNodeType(node) === 'list' && node.listType === 'number';
  state.listCounters.push(ordered ? 1 : 0);

  const items = getChildren(node)
    .map((child) => serializeNode(child, state))
    .filter(Boolean);

  state.listCounters.pop();
  return items.join('\n');
};

const serializeBlock = (node: Record<string, unknown>, state: SerializeState) => {
  const type = getNodeType(node);

  if (type === 'list') {
    return serializeList(node, state);
  }

  if (type === 'listitem') {
    return serializeListItem(node, state);
  }

  if (type === 'quote') {
    const content = serializeChildren(getChildren(node), state).trim();
    if (!content) {
      return '';
    }
    if (state.mode === 'html') {
      return content
        .split('\n')
        .map((line) => `› ${line}`)
        .join('\n');
    }
    return content
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
  }

  if (type === 'heading') {
    const content = serializeChildren(getChildren(node), state).trim();
    return content ? wrapFormatted(content, IS_BOLD, state.mode) : '';
  }

  return serializeChildren(getChildren(node), state);
};

const serializeNode = (node: unknown, state: SerializeState): string => {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const record = node as Record<string, unknown>;
  const type = getNodeType(record);

  if (type === 'text') {
    return serializeText(record, state);
  }

  if (type === 'linebreak') {
    takePlain(state, '\n');
    return '\n';
  }

  if (type === 'link' || type === 'autolink') {
    return serializeLink(record, state);
  }

  if (type === 'paragraph' || type === 'quote' || type === 'heading' || type === 'list' || type === 'listitem') {
    return serializeBlock(record, state);
  }

  if (record.root) {
    return serializeNode(record.root, state);
  }

  if (getChildren(record).length > 0) {
    // Unknown container (e.g. root): join block children with blank lines.
    const blocks = getChildren(record)
      .map((child) => serializeNode(child, state))
      .map((part) => part.trimEnd())
      .filter(Boolean);
    return blocks.join('\n');
  }

  return '';
};

/**
 * Convert Lexical editor JSON into Telegram HTML or Discord markdown,
 * preserving paragraph breaks and common text styles.
 */
export const extractLexicalFormattedText = (
  content: unknown,
  mode: FormatMode,
  maxLength = 800,
): string => {
  if (content == null) {
    return '';
  }

  const state: SerializeState = {
    mode,
    maxLength,
    plainLength: 0,
    truncated: false,
    listCounters: [],
  };

  return serializeNode(content, state).replace(/[ \t]+\n/g, '\n').trim();
};
