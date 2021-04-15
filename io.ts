import { stdFS as fs, stdPath as path } from "./deps.ts";

export function findFileInPaths(
  fileName: string,
  pathsToCheck: string[],
): string | undefined {
  return pathsToCheck.map((ptc) => path.join(ptc, fileName)).find((ptc) =>
    fs.existsSync(ptc)
  );
}
