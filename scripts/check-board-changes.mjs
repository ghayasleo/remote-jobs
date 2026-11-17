// Used by the weekly workflow after `npm run boards:scan`: decides whether the
// new data/job-boards.json is worth committing.
//   exit 0 + "changed"   -> commit it
//   exit 0 + "unchanged" -> only the timestamp moved; skip
//   exit 1               -> the scan looks broken (lost too many boards); skip
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FILE = "data/job-boards.json";
const MIN_KEPT = 0.9;

const before = JSON.parse(execFileSync("git", ["show", `HEAD:${FILE}`], { encoding: "utf8" })).boards;
const after = JSON.parse(readFileSync(FILE, "utf8")).boards;
const [oldCount, newCount] = [Object.keys(before).length, Object.keys(after).length];

if (newCount < oldCount * MIN_KEPT) {
  console.error(`Scan found ${newCount} boards, down from ${oldCount}. Probably a network problem; not committing.`);
  process.exit(1);
}
const changed = JSON.stringify(before) !== JSON.stringify(after);
console.log(changed ? "changed" : "unchanged");
console.error(`${oldCount} → ${newCount} boards`);
