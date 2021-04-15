import { inflect } from "./deps.ts";
import * as g from "./guess.ts";
import * as v from "./values.ts";

export type PropertyErrorMessage = string;

export interface PropertyErrorHandler {
  (pvs: v.PropertyValueSupplier, message: PropertyErrorMessage): void;
}

export type PropertyName = string;
export type PropertyNature = inflect.InflectableValue;

export interface PropertyNameTransformer {
  (srcPropName: PropertyName): PropertyName;
}

export function camelCasePropertyName(
  srcPropName: PropertyName,
): PropertyName {
  const result = srcPropName.replace(/\(s\)$/, "s");
  return inflect.toCamelCase(inflect.guessCaseValue(result));
}

export interface PropertyTypeScriptDeclOptions {
  readonly mutable?: boolean;
}

export type PropertyValueRequired = boolean | (() => boolean);

export interface PropertyValueTransformer {
  transformValue(
    pvs: v.PropertyValueSupplier,
    pipe: v.ValuePipe,
    tr: v.ValueTransformer,
  ): void;
}

export interface PropertyDefn extends PropertyValueTransformer {
  readonly nature: PropertyNature;
  readonly description: string;
  readonly valueRequired: PropertyValueRequired;
  readonly guessedBy?: g.PropertyDefnGuesser;
}
