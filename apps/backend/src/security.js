import { createHash, createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const keySeed = process.env.DATA_KEY || 'paisaos-dev-key-for-prototype-only';
const key = createHash('sha256').update(keySeed).digest();

export const createId = (prefix = 'id') => `${prefix}_${randomBytes(8).toString('hex')}`;

export const hashPassword = (password, salt = randomBytes(16).toString('hex')) => {
  const digest = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${digest}`;
};

export const verifyPassword = (password, hash) => {
  const [salt, digest] = hash.split(':');
  const candidate = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(digest, 'hex'));
};

export const emailDigest = (email) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

export const encryptText = (value) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptText = (value) => {
  const [ivHex, tagHex, bodyHex] = String(value).split(':');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(bodyHex, 'hex')), decipher.final()]).toString('utf8');
};

export const signSessionToken = () => randomBytes(24).toString('hex');

export const maskPii = (text = '') => {
  const value = String(text);
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};
