import { rename, rmdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const nestedAssets = fileURLToPath(new URL("../dist/client/brotskip/_next", import.meta.url));
const rootAssets = fileURLToPath(new URL("../dist/client/_next", import.meta.url));
const redundantDirectory = fileURLToPath(new URL("../dist/client/brotskip", import.meta.url));

await rename(nestedAssets, rootAssets);
await rmdir(redundantDirectory);
