import * as m from "./model.ts";
import * as p from "./property.ts";

export interface ContentValuesSupplier {
  readonly contentIndex: number;
  valueNames: string[];
  valueByName(name: p.PropertyName): unknown;
}

export function objectValuesSupplier(
  instance: Record<string, unknown>,
  index?: number,
): ContentValuesSupplier {
  return {
    contentIndex: index ? index : 0,
    valueNames: Object.keys(instance),
    valueByName: (name: p.PropertyName): unknown => {
      return instance[name];
    },
  };
}

export interface ArrayIndexByName {
  [key: string]: number;
}

export interface ArrayValuesIndex {
  readonly colIndexByName: ArrayIndexByName;
  readonly colNames: string[];
  readonly guessedFromRowIndex?: number;
}

export function guessArrayValueNamesFromHeaderRow(
  // deno-lint-ignore no-explicit-any
  instance: any[],
  rowCounter?: number,
): ArrayValuesIndex {
  const colIndexByName: ArrayIndexByName = {};
  instance.map((col: string, index: number) => colIndexByName[col] = index);
  return {
    colNames: instance,
    colIndexByName: colIndexByName,
    guessedFromRowIndex: rowCounter,
  };
}

export function arrayValuesSupplier(
  // deno-lint-ignore no-explicit-any
  instance: any[],
  index: ArrayValuesIndex,
  rowCounter?: number,
): ContentValuesSupplier {
  return {
    contentIndex: rowCounter ? rowCounter : 0,
    valueNames: index.colNames,
    valueByName: (name: p.PropertyName): unknown => {
      const colNum = index.colIndexByName[name];
      return colNum !== undefined
        ? instance[index.colIndexByName[name]]
        : undefined;
    },
  };
}

export interface ValueSupplier {
  readonly sourceCVS: ContentValuesSupplier;
  readonly valueRaw: unknown;
}

export interface PropertyValueSupplier extends ValueSupplier {
  readonly propName: p.PropertyName;
  readonly propDefn: p.PropertyDefn;
}

export interface ContentValuesDestination {
  readonly contentIndex: number;
  assign(name: p.PropertyName, value: unknown): void;
}

export interface ValuePipe {
  readonly source: ContentValuesSupplier;
  readonly destination?: ContentValuesDestination;
}

export interface ObjectPipe extends ValuePipe {
  readonly instance: { [name: string]: unknown };
}

export function objectPipe(
  source: ContentValuesSupplier,
  transformPropName: p.PropertyNameTransformer,
  index?: number,
): ObjectPipe {
  const newInstance: { [name: string]: unknown } = {};
  return {
    instance: newInstance,
    source: source,
    destination: {
      contentIndex: index ? index : 0,
      assign: (name: p.PropertyName, value: unknown): void => {
        newInstance[transformPropName(name)] = value;
      },
    },
  };
}

export function getSourceValueAndContinue(
  pvs: PropertyValueSupplier,
): [unknown, boolean] {
  const required = typeof pvs.propDefn.valueRequired === "function"
    ? pvs.propDefn.valueRequired()
    : pvs.propDefn.valueRequired;
  const srcValue = pvs.valueRaw;
  if (!required) {
    if (
      srcValue == null || srcValue == undefined ||
      Array.isArray(srcValue) && srcValue.length == 0 ||
      typeof srcValue === "object" &&
        Object.getOwnPropertyNames(srcValue).length == 0 ||
      typeof srcValue === "string" && srcValue.trim().length == 0
    ) {
      return [srcValue, false];
    }
  }
  return [srcValue, true];
}

export interface ValueTransformerOptions {
  readonly onContentError?: m.ContentErrorHandler;
  readonly onPropError?: p.PropertyErrorHandler;
  readonly transformPropName?: p.PropertyNameTransformer;
}

export interface ValueTransformer extends ValueTransformerOptions {
  readonly onContentError: m.ContentErrorHandler;
  readonly onPropError: p.PropertyErrorHandler;
  readonly transformPropName: p.PropertyNameTransformer;
  transformValues(vc: ValuePipe): void;
  childrenTransfomer(childModel: m.ContentModel): ValueTransformer;
}

export class ObjectValueTransformer
  implements ValueTransformer, m.ContentModelSupplier {
  readonly isContentModelSupplier = true;
  readonly onContentError: m.ContentErrorHandler;
  readonly onPropError: p.PropertyErrorHandler;
  readonly transformPropName: p.PropertyNameTransformer;

  constructor(
    readonly model: m.ContentModel,
    {
      onContentError: contentErrHandler,
      onPropError: propErrHandler,
      transformPropName: propNameTransformer,
    }: ValueTransformerOptions,
  ) {
    this.onContentError = contentErrHandler || m.consoleErrorHandler;
    this.onPropError = propErrHandler ||
      this.onContentError.reportPropertyError;
    this.transformPropName = propNameTransformer
      ? propNameTransformer
      : (original: p.PropertyName): p.PropertyName => {
        return original;
      };
  }

  transformValues(pipe: ValuePipe): void {
    for (const property of Object.entries(this.model)) {
      const srcPropName = property[0];
      const srcPropDefn = property[1];
      const value: PropertyValueSupplier = {
        propName: srcPropName,
        propDefn: srcPropDefn,
        sourceCVS: pipe.source,
        valueRaw: pipe.source.valueByName(srcPropName),
      };
      srcPropDefn.transformValue(value, pipe, this);
    }
  }

  childrenTransfomer(childModel: m.ContentModel): ValueTransformer {
    return new ObjectValueTransformer(childModel, this);
  }
}
