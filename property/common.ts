import {
  PropertyDefn,
  PropertyName,
  PropertyNameTransformer,
} from "../property.ts";
import * as v from "../values.ts";

export function getSourceValueAndContinue(
  prop: PropertyDefn,
  srcPropName: PropertyName,
  cvs: v.ContentValueSupplier,
): [any, boolean] {
  const required = typeof prop.valueRequired === "function"
    ? prop.valueRequired()
    : prop.valueRequired;
  let srcValue = cvs.valueRaw;
  if (typeof srcValue === "function") {
    srcValue = srcValue(prop, srcPropName, cvs);
  }
  if (!required) {
    if (srcValue == null || srcValue == undefined) {
      return [srcValue, false];
    }
    if (typeof srcValue === "string" && srcValue.trim().length == 0) {
      return [srcValue, false];
    }
  }
  return [srcValue, true];
}

export function assignDest(
  prop: PropertyDefn,
  srcPropName: PropertyName,
  destValue: any,
  destination: object,
  destFieldName?: PropertyNameTransformer,
): void {
  const dest = destination as any;
  const destName = destFieldName ? destFieldName(srcPropName) : srcPropName;
  dest[destName] = destValue;
}
