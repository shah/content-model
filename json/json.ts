import * as g from "../guess.ts";
import * as m from "../model.ts";
import * as v from "../values.ts";

export async function consumeJsonArrayWithFirstRowAsModel(
  sourceJSON: { [key: string]: any }[],
  consume: m.ContentConsumer,
  transformer: m.ContentTransformer = m.typedContentTransformer,
): Promise<m.ContentModel | undefined> {
  if (sourceJSON.length == 0) {
    return undefined;
  }

  const modelSource = sourceJSON[0];
  const tdg = new g.TypicalModelGuesser({});
  const values: v.ContentValuesSupplier = {
    contentIndex: 0,
    valueNames: Object.keys(modelSource),
    valueByName: (name: string): any => {
      return modelSource[name];
    },
  };
  tdg.guessDefnFromContent(values);
  const model = tdg.model;

  let contentIndex = 0;
  for (const row of sourceJSON) {
    const content: { [name: string]: any } = {};
    transformer(
      model,
      values,
      {
        contentIndex: contentIndex - 1,
        assign: (
          name: string,
          value: any,
          transform: (name: string) => string,
        ): void => {
          const valueName = transform ? transform(name) : name;
          content[valueName] = value;
        },
      },
      m.consoleErrorHandler,
    );
    const next = consume(content, contentIndex, model!);
    if (!next) break;
    contentIndex++;
  }
  return model!;
}

export async function consumeJsonWithFirstRowAsModel(
  sourceJSON: object | object[],
  consume: m.ContentConsumer,
  transformer: m.ContentTransformer = m.typedContentTransformer,
): Promise<m.ContentModel | undefined> {
  if (Array.isArray(sourceJSON)) {
    return consumeJsonArrayWithFirstRowAsModel(
      sourceJSON,
      consume,
      transformer,
    );
  } else {
    if (typeof sourceJSON === "object") {
      return consumeJsonArrayWithFirstRowAsModel(
        [sourceJSON],
        consume,
        transformer,
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
  transformer: m.ContentTransformer = m.typedContentTransformer,
): Promise<m.ContentModel | undefined> {
  const text = await Deno.readTextFile(jsonSource);
  const sourceJSON = JSON.parse(text);

  if (!sourceJSON) {
    console.error(`Unable to read a JSON object from ${jsonSource}`);
    return undefined;
  }

  return consumeJsonWithFirstRowAsModel(sourceJSON, consume, transformer);
}
