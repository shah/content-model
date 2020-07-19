import * as g from "../guess.ts";
import * as m from "../model.ts";
import * as p from "../property.ts";
import * as v from "../values.ts";

export async function consumeJsonArrayWithFirstRowAsModel(
  sourceJSON: { [key: string]: any }[],
  consume: m.ContentConsumer,
): Promise<m.ContentModel | undefined> {
  if (sourceJSON.length == 0) {
    return undefined;
  }

  const modelSource = sourceJSON[0];
  const sourceCVS = v.objectValuesSupplier(modelSource);
  const tdg = new g.TypicalModelGuesser({});
  const model = tdg.guessDefnFromValues(sourceCVS);
  const tr = new v.ObjectValueTransformer(
    model,
    { transformPropName: p.camelCasePropertyName },
  );

  let contentIndex = 0;
  for (const row of sourceJSON) {
    const rowCVS = v.objectValuesSupplier(row, contentIndex);
    const pipe = v.objectPipe(rowCVS, tr.transformPropName);
    tr.transformValues(pipe);
    const next = consume(pipe.instance, contentIndex, model!);
    if (!next) break;
    contentIndex++;
  }
  return model!;
}

export async function consumeJsonWithFirstRowAsModel(
  sourceJSON: object | object[],
  consume: m.ContentConsumer,
): Promise<m.ContentModel | undefined> {
  if (Array.isArray(sourceJSON)) {
    return consumeJsonArrayWithFirstRowAsModel(
      sourceJSON,
      consume,
    );
  } else {
    if (typeof sourceJSON === "object") {
      return consumeJsonArrayWithFirstRowAsModel(
        [sourceJSON],
        consume,
      );
    } else {
      console.error(
        `sourceJSON did not resolve to either an Array or Object, it's a (${typeof sourceJSON})`,
      );
      return undefined;
    }
  }
}

export async function consumeJsonFileWithFirstRowAsModel(
  jsonSource: string,
  consume: m.ContentConsumer,
): Promise<m.ContentModel | undefined> {
  const text = await Deno.readTextFile(jsonSource);
  const sourceJSON = JSON.parse(text);

  if (!sourceJSON) {
    console.error(`Unable to read a JSON object from ${jsonSource}`);
    return undefined;
  }

  return consumeJsonWithFirstRowAsModel(
    sourceJSON,
    consume,
  );
}
