import { stdBufIO, stdCSV as csv } from "../deps.ts";
import * as g from "../guess.ts";
import * as m from "../model.ts";
import * as v from "../values.ts";

export async function consumeCsvSourceWithHeader(
  csvSource: string,
  consume: m.ContentConsumer,
  transformer: m.ContentTransformer = m.typedContentTransformer,
): Promise<m.ContentModel> {
  const f = await Deno.open(csvSource);
  const matrix = await csv.readMatrix(new stdBufIO.BufReader(f));
  f.close();

  const colIndexByName: { [key: string]: number } = {};
  let headerRow: string[];
  let contentIndex = 0;
  let model = undefined;
  for (const row of matrix) {
    if (contentIndex == 0) {
      headerRow = row;
      row.map((col: string, index: number) => colIndexByName[col] = index);
      contentIndex++;
      continue;
    }

    const values: v.ContentValuesSupplier = {
      contentIndex: contentIndex,
      valueNames: headerRow!,
      valueByName: (name: string): any => {
        const index = colIndexByName[name];
        return row[index];
      },
    };

    if (contentIndex == 1) {
      const tdg = new g.TypicalModelGuesser({});
      tdg.guessDefnFromContent(values);
      model = tdg.model;
    }

    const content: { [name: string]: any } = {};
    transformer(
      model!,
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
