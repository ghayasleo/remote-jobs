// Minimal tar reader. Kept free of imports so scripts and tests can load it
// directly with Node's TypeScript support.

// Calls onFile for every regular file in a tar archive (the ustar/pax format
// GitHub serves). It is synchronous on purpose: reading the archive as a stream
// takes thousands of awaits, which overflows the call stack in React's
// dev-only async tracking.
export function readTar(archive: Buffer, onFile: (path: string, content: Buffer) => void) {
  let offset = 0;
  let paxPath: string | null = null;

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break; // end-of-archive marker

    const field = (start: number, length: number) =>
      header.subarray(start, start + length).toString("utf8").replace(/\0[\s\S]*$/, "");
    const size = parseInt(field(124, 12).trim() || "0", 8);
    const type = field(156, 1) || "0";
    const prefix = field(345, 155);
    const name = prefix ? `${prefix}/${field(0, 100)}` : field(0, 100);
    const body = archive.subarray(offset + 512, offset + 512 + size);

    if (type === "x") {
      // pax extended header: carries the full path when it is too long for `name`
      paxPath = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(body.toString("utf8"))?.[1] ?? null;
    } else {
      if (type === "0") onFile(paxPath ?? name, body);
      paxPath = null;
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
}
