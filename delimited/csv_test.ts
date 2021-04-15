import { stdAsserts as a } from "../deps.ts";
import * as io from "../io.ts";
import * as m from "../model.ts";
import * as c from "./csv.ts";

const pathsToCheck = [".", "./delimited"];

Deno.test("Consume CSV (single row)", async () => {
  const srcName = io.findFileInPaths("./csv_test-single-row.csv", pathsToCheck);
  a.assert(srcName);

  let contentCount = 0;
  const model = await c.consumeCsvSourceWithHeader(
    srcName,
    c.matrixFromLocalCSV,
    (): boolean => {
      contentCount++;
      return true;
    },
  );
  a.assert(model);
  a.assertEquals(
    Object.keys(model).length,
    13,
    `13 properties expected in ${srcName}`,
  );
  a.assertEquals(contentCount, 1, `One row expected, not ${contentCount}`);
});

Deno.test("Consume CSV (simple)", async () => {
  const srcName = io.findFileInPaths("./csv_test-simple.csv", pathsToCheck);
  a.assert(srcName);

  let contentCount = 0;
  const model = await c.consumeCsvSourceWithHeader(
    srcName,
    c.matrixFromLocalCSV,
    (): boolean => {
      contentCount++;
      return true;
    },
  );
  a.assert(model);
  a.assertEquals(
    Object.keys(model).length,
    4,
    `4 properties expected in ${srcName}`,
  );
  a.assertEquals(model["Login Date"].nature.inflect(), "DateTime");
  a.assertEquals(model["IP Address"].nature.inflect(), "IP Address");
  a.assertEquals(model["User Agent"].nature.inflect(), "Text");
  a.assertEquals(model["Login Type"].nature.inflect(), "Text");
});

Deno.test("Consume CSV (complex)", async () => {
  const srcName = io.findFileInPaths("./csv_test-complex.csv", pathsToCheck);
  a.assert(srcName);

  let contentCount = 0;
  const model = await c.consumeCsvSourceWithHeader(
    srcName,
    c.matrixFromLocalCSV,
    (): boolean => {
      contentCount++;
      return true;
    },
  );
  a.assert(model);
  a.assertEquals(
    Object.keys(model).length,
    80,
    `80 properties expected in ${srcName}`,
  );
  a.assertEquals(
    contentCount,
    5,
    `5 rows expected in ${srcName} not ${contentCount}`,
  );
});
