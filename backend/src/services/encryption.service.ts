import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

export class EncryptionService {
  private key: Buffer | null = null;

  constructor() {
    // If running in local camp mode, use the provided CAMP_SECRET or a fallback
    // In production cloud mode, this isn't strictly necessary as Postgres encrypts at rest,
    // but useful if we ever do app-level field encryption.
    const secret = process.env.CAMP_SECRET || "offline_camp_secret_123";
    
    // Derive a stable 32-byte key using a static salt so it's consistent across restarts
    // In a real implementation, salt should be stored or uniquely generated per camp
    const salt = Buffer.from("arogya_camp_static_salt_for_key_derivation", "utf8");
    this.key = crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha512");
  }

  /**
   * Encrypts a string and returns a hex string containing IV, Auth Tag, and Ciphertext
   */
  public encrypt(text: string): string {
    if (!this.key) throw new Error("Encryption key not initialized");
    if (!text) return text;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    
    // Format: iv:authTag:encryptedData
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts a hex string formatted as IV:AuthTag:Ciphertext
   */
  public decrypt(encryptedData: string): string {
    if (!this.key) throw new Error("Encryption key not initialized");
    if (!encryptedData || !encryptedData.includes(":")) return encryptedData;

    try {
      const parts = encryptedData.split(":");
      if (parts.length !== 3) return encryptedData;

      const iv = Buffer.from(parts[0], "hex");
      const authTag = Buffer.from(parts[1], "hex");
      const text = parts[2];

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(text, "hex", "utf8");
      decrypted += decipher.final("utf8");
      
      return decrypted;
    } catch (err) {
      console.error("[EncryptionService] Decryption failed. Corrupt data or wrong key.");
      return encryptedData; // fallback
    }
  }
}

export const encryptionService = new EncryptionService();
