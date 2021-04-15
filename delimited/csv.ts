import { stdBufIO, stdCSV as csv } from "../deps.ts";
import * as g from "../guess.ts";
import * as m from "../model.ts";
import * as p from "../property.ts";
import * as v from "../values.ts";

export async function consumeCsvSourceWithHeader(
  csvSource: string,
  consume: m.ContentConsumer,
): Promise<m.ContentModel | undefined> {
  const f = await Deno.open(csvSource);
  const matrix = await csv.readMatrix(new stdBufIO.BufReader(f));
  f.close();

  let rowIndex = 0;
  let index: v.ArrayValuesIndex | undefined = undefined;
  let model: m.ContentModel | undefined = undefined;
  let tr: v.ValueTransformer | undefined = undefined;
  for (const row of matrix) {
    if (rowIndex == 0) {
      index = v.guessArrayValueNamesFromHeaderRow(row, rowIndex);
      rowIndex++;
      continue;
    }

    if (!index) {
      console.error(
        "Encountered a row where we need names but no name index available",
      );
      return undefined;
    }

    const rowCVS = v.arrayValuesSupplier(row, index, rowIndex);
    if (rowIndex == 1) {
      const tdg = new g.TypicalModelGuesser({});
      model = tdg.guessDefnFromValues(rowCVS);
      tr = new v.ObjectValueTransformer(
        model!,
        { transformPropName: p.camelCasePropertyName },
      );
    }

    if (!(model && tr)) {
      console.error(
        "Transformer could not be created since model from header row is not available",
      );
      return undefined;
    }

    const pipe = v.objectPipe(rowCVS, tr.transformPropName);
    tr.transformValues(pipe);
    const next = consume(pipe.instance, rowIndex, model);
    if (!next) break;
    rowIndex++;
  }
  return model!;
}
