const ITERATIONS = 100000;
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (value: string) => new Uint8Array(value.match(/../g)!.map((b) => parseInt(b, 16)));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return hex(new Uint8Array(bits));
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${hex(salt)}$${await derive(password, salt, ITERATIONS)}`;
}
export async function checkPassword(password: string, stored: string) {
  const [kind, iter, salt, expected] = stored.split("$");
  if (kind !== "pbkdf2" || !salt || !expected) return false;
  const actual = await derive(password, unhex(salt), Number(iter));
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ (expected.charCodeAt(i) || 0);
  return diff === 0;
}
