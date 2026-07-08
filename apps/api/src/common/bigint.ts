// BigInt is not JSON-serializable by default. Prisma returns BigInt for size_bytes;
// serialize it as a string so responses never crash. Mappers convert to Number where safe.
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function toJSON(this: bigint): string {
  return this.toString();
};

export {};
