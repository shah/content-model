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
    source: v.ContentValuesSupplier,
    destination: v.ContentValuesDestination,
    eh: ContentErrorHandler,
    tranformFieldName?: p.PropertyNameTransformer,
  ): void;
}

export function typedContentTransformer(
  model: ContentModel,
  source: v.ContentValuesSupplier,
  destination: v.ContentValuesDestination,
  eh: ContentErrorHandler,
  tranformFieldName?: p.PropertyNameTransformer,
): void {
  for (const property of Object.entries(model)) {
    const propertyName = property[0];
    const propDefn = property[1];
    const cvs: v.ContentValueSupplier = {
      ...source,
      valueRaw: source.valueByName(propertyName),
    };
    propDefn.transformValue(
      propertyName,
      cvs,
      eh.reportPropertyError,
      destination,
      tranformFieldName,
    );
  }
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
