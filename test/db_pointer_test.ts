import { deserialize } from "../src/bson.ts";
import { Buffer } from "../deps.ts";
// 0x0C foo\0 \0\0\07 String.fromCharCode(0x41, 0x42, 0xfffd, 0x43, 0x44) 12
const bsonSnippet = Buffer.from([
  // Size
  34,
  0,
  0,
  0,
  // BSON type for DBPointer
  0x0c,

  // CString Label Foo
  0x66,
  0x6f,
  0x6f,
  0,

  // Length of UTF8 string "AB�CD"
  8,
  0,
  0,
  0,
  0x41,
  0x42,
  0xef,
  0xbf,
  0xbd,
  0x43,
  0x44,
  0,

  // 12-bit pointer
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,

  // null terminator
  0,
]);
Deno.test("[dbpointer tests] can serialize and deserialize 0xFFFD in dbpointer name", () => {
  deserialize(bsonSnippet);
});