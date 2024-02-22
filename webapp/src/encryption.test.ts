import {
  decrypt,
  decryptAsymmetric,
  encrypt,
  encryptAsymmetric,
  exportCryptoKey,
  generateKeyPair,
  generateSharedKey,
  importPublicKey,
  importSharedKey,
} from "./encryption";

describe("asymmetric", () => {
  let keyPair: CryptoKeyPair;

  beforeAll(async () => {
    keyPair = await generateKeyPair();
  });

  test("can export public key", async () => {
    await expect(
      window.crypto.subtle.exportKey("jwk", keyPair.publicKey)
    ).resolves.not.toThrow();
  });

  test("cannot export private key", async () => {
    await expect(
      window.crypto.subtle.exportKey("jwk", keyPair.privateKey)
    ).rejects.toThrow(/not extractable/);
  });

  test("import public key", async () => {
    const jwk = await exportCryptoKey(keyPair.publicKey);
    await expect(importPublicKey(jwk)).resolves;
  });

  test("encrypt decrypt", async () => {
    const data = "hello";
    const jwk = await exportCryptoKey(keyPair.publicKey);
    // import other device's public key
    const publicKey = await importPublicKey(jwk);
    // encrypt with public key so that only that device's private key can decrypt
    const encrypted = await encryptAsymmetric(publicKey, data);
    // encrypted data can be sent over the network to the other device
    const decrypted = await decryptAsymmetric(keyPair.privateKey, encrypted);
    expect(decrypted).toStrictEqual(data);
  });
});

describe("shared key", () => {
  let key: CryptoKey;

  beforeAll(async () => {
    key = await generateSharedKey();
  });

  test("can export shared key", async () => {
    await expect(
      window.crypto.subtle.exportKey("raw", key)
    ).resolves.not.toThrow();
  });

  test("import shared key", async () => {
    const jwk = await exportCryptoKey(key);
    await expect(importSharedKey(jwk)).resolves.not.toThrow();
  });

  test("encrypt decrypt", async () => {
    const data = "hello";
    const encrypted = await encrypt(key, data);
    const decrypted = await decrypt(key, encrypted);
    expect(decrypted).toStrictEqual(data);
  });

  test("imported key encrypt decrypt", async () => {
    const jwk = await exportCryptoKey(key);
    const importedKey = await importSharedKey(jwk);

    const data = "hello";
    const encrypted = await encrypt(importedKey, data);
    const decrypted = await decrypt(key, encrypted);
    expect(decrypted).toStrictEqual(data);
  });
});
