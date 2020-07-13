import {
  PropertyDefn,
  PropertyNameTransformer,
  PropertyName,
} from "../property.ts";

export function getSourceValueAndContinue(
  prop: PropertyDefn,
  srcPropName: PropertyName,
  srcContent: { [propName: string]: any },
): [any, boolean] {
  const required = typeof prop.valueRequired === "function"
    ? prop.valueRequired()
    : prop.valueRequired;
  let srcValue = srcContent[srcPropName];
  if (typeof srcValue === "function") {
    srcValue = srcValue(prop, srcPropName, srcContent);
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
