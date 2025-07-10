import * as CryptoJS from "npm:crypto-js@4.2.0";

/**
 * Encrypts sensitive data using AES-256
 * @param data The data to encrypt
 * @param key The encryption key
 * @returns The encrypted data as a string
 */
export function encrypt(data: string, key: string): string {
  if (!data) return "";
  return CryptoJS.AES.encrypt(data, key).toString();
}

/**
 * Decrypts data that was encrypted with AES-256
 * @param encryptedData The encrypted data
 * @param key The encryption key
 * @returns The decrypted data as a string
 */
export function decrypt(encryptedData: string, key: string): string {
  if (!encryptedData) return "";
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}