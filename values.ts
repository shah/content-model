export interface ContentValuesSupplier {
  readonly contentIndex: number;
  valueNames: string[];
  valueByName(name: string): any;
}

export interface ContentValueSupplier extends ContentValuesSupplier {
  readonly valueRaw: any;
}
