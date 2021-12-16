import { Binary, BinarySizes } from "./binary.ts";
import {
  bufferToUuidHexString,
  uuidHexStringToBuffer,
  uuidValidateString,
} from "./uuid_utils.ts";
import { randomBytes } from "./parser/utils.ts";
import { BSONTypeError } from "./error.ts";
import { equals } from "../deps.ts";
const BYTE_LENGTH = 16;

/**
 * A class representation of the BSON UUID type.
 * @public
 */
export class UUID {
  static cacheHexString: boolean;

  #bytesBuffer: Uint8Array;
  #id?: string;

  /**
   * Create an UUID type
   *
   * @param input - Can be a 32 or 36 character hex string (dashes excluded/included) or a 16 byte binary Buffer.
   */
  constructor(input?: string | Uint8Array | UUID) {
    if (typeof input === "undefined") {
      // The most common use case (blank id, new UUID() instance)
      this.id = UUID.generate();
    } else if (input instanceof UUID) {
      this.#bytesBuffer = input.id;
      this.#id = input.#id;
    } else if (ArrayBuffer.isView(input) && input.byteLength === BYTE_LENGTH) {
      this.id = input;
    } else if (typeof input === "string") {
      this.id = uuidHexStringToBuffer(input);
    } else {
      throw new BSONTypeError(
        "Argument passed in UUID constructor must be a UUID, a 16 byte Buffer or a 32/36 character hex string (dashes excluded/included, format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).",
      );
    }
    this.#bytesBuffer = this.id;
  }

  /**
   * The UUID bytes
   * @readonly
   */
  get id(): Uint8Array {
    return this.#bytesBuffer;
  }

  set id(value: Uint8Array) {
    this.#bytesBuffer = value;

    if (UUID.cacheHexString) {
      this.#id = bufferToUuidHexString(value);
    }
  }

  /**
   * Returns the UUID id as a 32 or 36 character hex string representation, excluding/including dashes (defaults to 36 character dash separated)
   * @param includeDashes - should the string exclude dash-separators.
   */
  toHexString(includeDashes = true): string {
    if (UUID.cacheHexString && this.#id) {
      return this.#id;
    }

    const uuidHexString = bufferToUuidHexString(this.id, includeDashes);

    if (UUID.cacheHexString) {
      this.#id = uuidHexString;
    }

    return uuidHexString;
  }

  /**
   * same as to `toHexString` method
   */
  toString(): string {
    return this.toHexString();
  }

  /**
   * Converts the id into its JSON string representation.
   * A 36 character (dashes included) hex string in the format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   */
  toJSON(): string {
    return this.toHexString();
  }

  /**
   * Compares the equality of this UUID with `otherID`.
   *
   * @param otherId - UUID instance to compare against.
   */
  equals(otherId: string | Uint8Array | UUID): boolean {
    if (!otherId) {
      return false;
    }

    if (otherId instanceof UUID) {
      return equals(otherId.id, this.id);
    }

    try {
      return equals(new UUID(otherId).id, this.id);
    } catch {
      return false;
    }
  }

  /**
   * Creates a Binary instance from the current UUID.
   */
  toBinary(): Binary {
    return new Binary(this.id, BinarySizes.SUBTYPE_UUID);
  }

  /**
   * Generates a populated buffer containing a v4 uuid
   */
  static generate(): Uint8Array {
    const bytes = randomBytes(BYTE_LENGTH);

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    // Kindly borrowed from https://github.com/uuidjs/uuid/blob/master/src/v4.js
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return bytes;
  }

  /**
   * Checks if a value is a valid bson UUID
   * @param input - UUID, string or Buffer to validate.
   */
  static isValid(input: string | Uint8Array | UUID): boolean {
    if (!input) {
      return false;
    }

    if (input instanceof UUID) {
      return true;
    }

    if (typeof input === "string") {
      return uuidValidateString(input);
    }

    if (input instanceof Uint8Array) {
      // check for length & uuid version (https://tools.ietf.org/html/rfc4122#section-4.1.3)
      if (input.length !== BYTE_LENGTH) {
        return false;
      }

      try {
        // get this byte as hex:             xxxxxxxx-xxxx-XXxx-xxxx-xxxxxxxxxxxx
        // check first part as uuid version: xxxxxxxx-xxxx-Xxxx-xxxx-xxxxxxxxxxxx
        return parseInt(input[6].toString(16)[0], 10) ===
          BinarySizes.SUBTYPE_UUID;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Creates an UUID from a hex string representation of an UUID.
   * @param hexString - 32 or 36 character hex string (dashes excluded/included).
   */
  static createFromHexString(hexString: string): UUID {
    const buffer = uuidHexStringToBuffer(hexString);
    return new UUID(buffer);
  }

  [Symbol.for("Deno.customInspect")](): string {
    return `new UUID("${this.toHexString()}")`;
  }
}
