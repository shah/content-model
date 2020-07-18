import { inflect } from "./deps.ts";
import * as g from "./guess.ts";
import * as v from "./values.ts";

export type PropertyErrorMessage = string;

export interface PropertyErrorHandler {
  (
    propDefn: PropertyDefn,
    propName: string,
    propValue: any,
    cvs: v.ContentValueSupplier,
    message: PropertyErrorMessage,
  ): void;
}

export type PropertyName = string;
export type PropertyNature = inflect.InflectableValue;

export interface PropertyNameTransformer {
  (srcPropName: PropertyName): PropertyName;
}

export function camelCasePropertyName(
  srcPropName: PropertyName,
): PropertyName {
  let result = srcPropName.replace(/\(s\)$/, "s");
  return inflect.toCamelCase(inflect.guessCaseValue(result));
}

export interface PropertyTypeScriptDeclOptions {
  readonly mutable?: boolean;
}

export type PropertyValueRequired = boolean | (() => boolean);

export interface PropertyValueTransformer {
  transformValue(
    srcPropName: PropertyName,
    srcValues: v.ContentValuesSupplier,
    reportError: PropertyErrorHandler,
    destination?: v.ContentValuesDestination, // when not supplied, transform only validates
    destFieldName?: PropertyNameTransformer,
  ): void;
}

export interface PropertyDefn extends PropertyValueTransformer {
  readonly nature: PropertyNature;
  readonly description: string;
  readonly valueRequired: PropertyValueRequired;
  readonly guessedBy?: g.PropertyDefnGuesser;
}
