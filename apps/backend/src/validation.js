export const requireFields = (body, fields) => {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return `Missing required field: ${field}`;
    }
  }
  return null;
};

export const parseJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON body');
  }
};

export const ensurePositiveNumber = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return `${fieldName} must be a non-negative number`;
  return null;
};

export const parseCsvRows = (csv) => {
  const lines = String(csv).trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { header: [], rows: [] };
  const header = lines[0].split(',').map((x) => x.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((x) => x.trim());
    return Object.fromEntries(header.map((key, idx) => [key, values[idx] ?? '']));
  });
  return { header, rows };
};
