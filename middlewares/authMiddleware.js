const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const generateVerificationToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "5M",
  });
};

const encryptVerificationCode = (verificationCode) => {
  const secretKey = process.env.VERIFICATION_SECRET_KEY;
  const vector = process.env.VERIFICATION_VECTOR;
  const algorithm = process.env.VERIFICATION_ALGORITHM;

  if (!secretKey || !vector) {
    throw new Error(
      "Encryption secret key or vector is not set in environment variables."
    );
  }

  if (Buffer.from(vector, "hex").length !== 16) {
    throw new Error("Invalid vector length. Must be 16 bytes.");
  }

  const key = crypto.pbkdf2Sync(
    secretKey,
    Buffer.from(vector, "hex"),
    100000,
    32,
    "sha256"
  );
  const iv = Buffer.from(vector, "hex");

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encryptedData = cipher.update(verificationCode, "utf-8", "hex");
  encryptedData += cipher.final("hex");

  return encryptedData;
};

const decryptVerificationCode = (encryptedCode) => {
  if (!encryptedCode) {
    throw new Error("Encrypted code is undefined or empty");
  }

  const secretKey = process.env.VERIFICATION_SECRET_KEY;
  const vector = process.env.VERIFICATION_VECTOR;
  const algorithm = process.env.VERIFICATION_ALGORITHM;

  if (!secretKey || !vector) {
    throw new Error(
      "Decryption secret key or vector is not set in environment variables."
    );
  }

  if (Buffer.from(vector, "hex").length !== 16) {
    throw new Error("Invalid vector length. Must be 16 bytes.");
  }

  try {
    const key = crypto.pbkdf2Sync(
      secretKey,
      Buffer.from(vector, "hex"),
      100000,
      32,
      "sha256"
    );
    const iv = Buffer.from(vector, "hex");

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decryptedData = decipher.update(encryptedCode, "hex", "utf-8");
    decryptedData += decipher.final("utf-8");

    return decryptedData;
  } catch (error) {
    console.log(error);
    console.error("Error decrypting verification code:", error.message);
    throw new Error("Failed to decrypt verification code");
  }
};

module.exports = {
  generateVerificationToken,
  encryptVerificationCode,
  decryptVerificationCode,
};
