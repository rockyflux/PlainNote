/**
 * Single Vercel function entry. vercel.json rewrites /api/* and /raw/* here
 * while preserving the public path via x-forwarded-uri / request restoration.
 */
export { default } from '../src/server/vercel-handler.js';
