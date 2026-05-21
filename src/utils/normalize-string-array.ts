export const normalizeStringArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeArrayItem);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        return Array.isArray(parsed)
          ? parsed.map(normalizeArrayItem)
          : [trimmed];
      } catch {
        return [trimmed];
      }
    }

    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return [String(value)];
  }

  return [];
};

const normalizeArrayItem = (item: unknown): string => {
  if (typeof item === 'string') {
    return item;
  }

  if (typeof item === 'number' || typeof item === 'boolean' || typeof item === 'bigint') {
    return String(item);
  }

  return '';
};
