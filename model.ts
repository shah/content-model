import { safety } from "./deps.ts";
import * as p from "./property.ts";
import * as v from "./values.ts";

export interface ContentModel {
  [propertyName: string]: p.PropertyDefn;
}

export interface ContentModelSupplier {
  readonly model: ContentModel;
}

export const isContentModelSupplier = safety.typeGuard<ContentModelSupplier>(
  "model",
);

export type ContentErrorMessage = string;

export interface ContentErrorHandler {
  readonly reportPropertyError: p.PropertyErrorHandler;
  reportContentError(
    model: ContentModel,
    content: { [propName: string]: unknown },
    index: number,
    message: ContentErrorMessage,
  ): void;
}

export interface ContentConsumer {
  (
    content: Record<string, unknown>,
    index: number,
    model: ContentModel,
  ): boolean;
}

export class ConsoleErrorHandler implements ContentErrorHandler {
  reportPropertyError(
    pvs: v.PropertyValueSupplier,
    message: p.PropertyErrorMessage,
  ): void {
    console.log(
      `[Item ${pvs.sourceCVS.contentIndex} ${pvs.propName}]: ${pvs.valueRaw} (${message})`,
    );
  }

  reportContentError(
    _model: ContentModel,
    _content: { [propName: string]: unknown },
    index: number,
    message: ContentErrorMessage,
  ): void {
    console.log(`[Item ${index}] ${message}`);
  }
}

export const consoleErrorHandler = new ConsoleErrorHandler();
