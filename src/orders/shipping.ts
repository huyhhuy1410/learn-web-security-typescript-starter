import {
  decryptWithKeyring,
  deserializeEncryptedPayload,
  encryptWithKeyring,
  serializeEncryptedPayload,
} from "../storage/keyring.ts";
import type { Keyring } from "../storage/keyring.ts";

export type ShippingDetails = {
  name: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
};

export function encryptShippingDetails(
  details: ShippingDetails,
  keyring: Keyring | undefined,
): string {
  const detailsString = JSON.stringify(details);
  const payload = Buffer.from(detailsString);
  const encryptedPaylload = encryptWithKeyring(payload, keyring);
  return serializeEncryptedPayload(encryptedPaylload).toString("utf-8");
}

export function decryptShippingDetails(
  serialized: string,
  keyring: Keyring | undefined,
): ShippingDetails {
  let details: unknown;
  try {
    const deseralized = deserializeEncryptedPayload(Buffer.from(serialized));
    const decrypted = decryptWithKeyring(deseralized, keyring);
    details = JSON.parse(decrypted.toString("utf-8"));
  } catch {
    throw new Error("Invalid shipping details");
  }

  if (!isShippingDetails(details)) {
    throw new Error("Invalid shipping details");
  }

  return details;
}

function isShippingDetails(details: unknown): details is ShippingDetails {
  if (!details || typeof details !== "object") {
    return false;
  }

  const candidate = details as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.address === "string" &&
    typeof candidate.city === "string" &&
    typeof candidate.region === "string" &&
    typeof candidate.postalCode === "string"
  );
}
