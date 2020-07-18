import { stdAsserts as a } from "../deps.ts";
import * as c from "./csv.ts";
import * as m from "../model.ts";
import * as io from "../io.ts";

const pathsToCheck = [".", "csv"];

Deno.test("Consume CSV (single row)", async () => {
  const csvName = io.findFileInPaths("./csv_test-single-row.csv", pathsToCheck);
  a.assert(csvName);

  let contentCount = 0;
  const model = await c.consumeCsvSourceWithHeader(
    csvName,
    (content: object, index: number, model: m.ContentModel): boolean => {
      contentCount++;
      return true;
    },
    m.typedContentTransformer,
  );
  a.assertEquals(
    Object.keys(model).length,
    13,
    `13 properties expected in ${csvName}`,
  );
  a.assertEquals(contentCount, 1, `One row expected, not ${contentCount}`);
});

Deno.test("Consume CSV (simple)", async () => {
  const csvName = io.findFileInPaths("./csv_test-simple.csv", pathsToCheck);
  a.assert(csvName);

  const model = await c.consumeCsvSourceWithHeader(
    csvName,
    (content: object, index: number, model: m.ContentModel): boolean => {
      return false;
    },
    m.typedContentTransformer,
  );
  a.assertEquals(
    Object.keys(model).length,
    4,
    `4 properties expected in ${csvName}`,
  );
  a.assertEquals(model["Login Date"].nature, "DateTime");
  a.assertEquals(model["IP Address"].nature, "IP Address");
  a.assertEquals(model["User Agent"].nature, "Text");
  a.assertEquals(model["Login Type"].nature, "Text");
});

Deno.test("Consume CSV (complex)", async () => {
  const csvName = io.findFileInPaths("./csv_test-complex.csv", pathsToCheck);
  a.assert(csvName);

  const model = await c.consumeCsvSourceWithHeader(
    csvName,
    (content: object, index: number, model: m.ContentModel): boolean => {
      return true;
    },
    m.typedContentTransformer,
  );
  a.assertEquals(
    Object.keys(model).length,
    80,
    `80 properties expected in ${csvName}`,
  );
});
