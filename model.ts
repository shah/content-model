import { csv } from "./deps.ts";
import * as g from "./guess.ts";
import * as p from "./property.ts";

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
    content: { [key: string]: any },
    contentIndex: number,
    eh: ContentErrorHandler,
    tranformFieldName?: p.PropertyNameTransformer,
  ): object;
}

export function typedContentTransformer(
  model: ContentModel,
  content: { [key: string]: any },
  contentIndex: number,
  eh: ContentErrorHandler,
  tranformFieldName?: p.PropertyNameTransformer,
): object {
  const result: { [key: string]: any } = {};
  for (const property of Object.entries(model)) {
    const propertyName = property[0];
    const propDefn = property[1];
    propDefn.transformValue(
      propertyName,
      contentIndex,
      content,
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
    content: { [propName: string]: any },
    contentIndex: number,
    message: p.PropertyErrorMessage,
  ): void {
    console.log(
      `[Item ${contentIndex} ${propName}]: ${propValue} (${message})`,
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
  let contentIndex = 0;
  let model = undefined;
  for await (const row of csv.readCSVObjects(f)) {
    if (contentIndex == 0) {
      const tdg = new g.TypicalModelGuesser({});
      tdg.guessDefnFromContent(row);
      model = tdg.model;
    }
    const content = transformer(
      model!,
      row,
      contentIndex,
      consoleErrorHandler,
    );
    const next = consume(content, contentIndex, model!);
    if (!next) break;
    contentIndex++;
  }
  f.close();
  return model!;
}
