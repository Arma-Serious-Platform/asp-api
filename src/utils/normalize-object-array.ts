export const normalizeObjectArray = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    if (value.length === 1 && typeof value[0] === 'string') {
      return parseJsonArrayString(value[0]);
    }

    return value.map((item) => {
      if (typeof item !== 'string') {
        return item;
      }

      const trimmed = item.trim();
      if (!trimmed.startsWith('{')) {
        return item;
      }

      try {
        return JSON.parse(trimmed) as unknown;
      } catch {
        return item;
      }
    });
  }

  if (typeof value === 'string') {
    return parseJsonArrayString(value);
  }

  return value;
};

const parseJsonArrayString = (value: string): unknown => {
  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  if (!trimmed.startsWith('[')) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
};
