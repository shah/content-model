import { stdAsserts as a } from "../deps.ts";
import * as j from "./json.ts";
import * as m from "../model.ts";
import * as io from "../io.ts";

const pathsToCheck = [".", "./json"];

Deno.test("Consume JSON object array", async () => {
  const srcName = io.findFileInPaths("./json_test-simple.json", pathsToCheck);
  a.assert(srcName);

  let contentCount = 0;
  const model = await j.consumeJsonFileWithFirstRowAsModel(
    srcName,
    (content: object, index: number, model: m.ContentModel): boolean => {
      contentCount++;
      return true;
    },
    m.typedContentTransformer,
  );
  a.assert(model);
  a.assertEquals(
    Object.keys(model).length,
    27,
    `27 properties expected in ${srcName}, not ${Object.keys(model).length}`,
  );
  a.assertEquals(contentCount, 1, `One rows expected, not ${contentCount}`);
  console.dir(model);
});
