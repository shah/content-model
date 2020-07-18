import { stdPath as path, stdFS as fs } from "./deps.ts";

export function findFileInPaths(
  fileName: string,
  pathsToCheck: string[],
): string | undefined {
  return pathsToCheck.map((ptc) => path.join(ptc, fileName)).find((ptc) =>
    fs.existsSync(ptc)
  );
}
