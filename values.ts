export interface ContentValuesSupplier {
  readonly contentIndex: number;
  valueNames: string[];
  valueByName(name: string): any;
}

export interface ContentValueSupplier extends ContentValuesSupplier {
  readonly valueRaw: any;
}

export interface ContentValuesDestination {
  readonly contentIndex: number;
  assign(
    name: string,
    value: any,
    transform?: (name: string) => string,
  ): void;
}
