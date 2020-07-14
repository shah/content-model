import { asserts as a } from "./deps.ts";
import * as m from "./model.ts";

Deno.test("Consume CSV (single row)", async () => {
  const csvName = "./model_test-single-row.csv";
  let contentCount = 0;
  const model = await m.consumeCsvSourceWithHeader(
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
  const csvName = "model_test-simple.csv";
  const model = await m.consumeCsvSourceWithHeader(
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
  const csvName = "model_test-complex.csv";
  const model = await m.consumeCsvSourceWithHeader(
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
