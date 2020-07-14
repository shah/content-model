import { bufIO, csv } from "./deps.ts";
import * as g from "./guess.ts";
import * as p from "./property.ts";
import * as v from "./values.ts";

export interface ContentModel {
  [propertyName: string]: p.PropertyDefn;
}

export type ContentErrorMessage = string;

export interface ContentErrorHandler {
  readonly reportPropertyError: p.PropertyErrorHandler;
  reportContentError(
    model: ContentModel,
    content: { [propName: string]: any },
    index: number,
    message: ContentErrorMessage,
  ): void;
}

export interface ContentTransformer {
  (
    model: ContentModel,
    values: v.ContentValuesSupplier,
    eh: ContentErrorHandler,
    tranformFieldName?: p.PropertyNameTransformer,
  ): object;
}

export function typedContentTransformer(
  model: ContentModel,
  values: v.ContentValuesSupplier,
  eh: ContentErrorHandler,
  tranformFieldName?: p.PropertyNameTransformer,
): object {
  const result: { [key: string]: any } = {};
  for (const property of Object.entries(model)) {
    const propertyName = property[0];
    const propDefn = property[1];
    propDefn.transformValue(
      propertyName,
      values,
      eh.reportPropertyError,
      result,
      tranformFieldName,
    );
  }
  return result;
}

export interface ContentConsumer {
  (content: object, index: number, model: ContentModel): boolean;
}

export class ConsoleErrorHandler implements ContentErrorHandler {
  reportPropertyError(
    propDefn: p.PropertyDefn,
    propName: string,
    propValue: any,
    cvs: v.ContentValuesSupplier,
    message: p.PropertyErrorMessage,
  ): void {
    console.log(
      `[Item ${cvs.contentIndex} ${propName}]: ${propValue} (${message})`,
    );
  }

  reportContentError(
    model: ContentModel,
    content: { [propName: string]: any },
    index: number,
    message: ContentErrorMessage,
  ): void {
    console.log(`[Item ${index}] ${message}`);
  }
}

export const consoleErrorHandler = new ConsoleErrorHandler();

export async function consumeCsvSourceWithHeader(
  csvSource: string,
  consume: ContentConsumer,
  transformer: ContentTransformer = typedContentTransformer,
): Promise<ContentModel> {
  const f = await Deno.open(csvSource);
  const matrix = await csv.readMatrix(new bufIO.BufReader(f));
  f.close();

  const colIndexByName: { [key: string]: number } = {};
  let headerRow: string[];
  let contentIndex = 0;
  let model = undefined;
  for (const row of matrix) {
    if (contentIndex == 0) {
      headerRow = row;
      row.map((col, index) => colIndexByName[col] = index);
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

    const content = transformer(
      model!,
      values,
      consoleErrorHandler,
    );
    const next = consume(content, contentIndex, model!);
    if (!next) break;
    contentIndex++;
  }
  return model!;
}
