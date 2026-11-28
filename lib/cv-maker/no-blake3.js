// Stands in for the optional `blake3-wasm` that the LaTeX engine (Siglum)
// tries to import for faster cache hashing. Its WebAssembly import doesn't
// bundle under Turbopack, and the engine already falls back to a built-in
// hash when the import fails, so this module fails on purpose.
// Wired up with turbopack.resolveAlias in next.config.ts.
throw new Error("blake3-wasm isn't bundled; the LaTeX engine uses its built-in hash.");
