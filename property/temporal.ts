import { moment } from "../deps.ts";
import { PropertyDefnGuesser } from "../guess.ts";
import {
  PropertyDefn,
  PropertyErrorHandler,
  PropertyName,
  PropertyNameTransformer,
  PropertyNature,
  PropertyValueRequired,
} from "../property.ts";
import * as c from "./common.ts";

export interface DateConstraint {
  readonly tryMomentFormat: string;
}

export class DateTimeProperty implements PropertyDefn {
  readonly nature: PropertyNature = "DateTime";

  constructor(
    readonly valueRequired: PropertyValueRequired,
    readonly momentFormat: string,
    readonly strict: boolean = false,
    readonly guessedContraint?: DateConstraint,
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
  }

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.srcContentIndex})`
      : " (supplied)";
    return `Any text that matches MomentJS date format '${this.momentFormat}'${guessedFrom}`;
  }

  transformValue(
    srcPropName: PropertyName,
    srcContentIndex: number,
    srcContent: { [propName: string]: any },
    reportError: PropertyErrorHandler,
    destination?: object,
    destFieldName?: PropertyNameTransformer,
  ): void {
    const [srcValue, required] = c.getSourceValueAndContinue(
      this,
      srcPropName,
      srcContent,
    );
    if (!required) return;

    if (srcValue instanceof Date) {
      if (destination) {
        c.assignDest(this, srcPropName, srcValue, destination, destFieldName);
        return;
      }
    }

    if (!(typeof srcValue === "string")) {
      reportError(
        this,
        srcPropName,
        srcValue,
        srcContent,
        srcContentIndex,
        `[DateTimeProperty] ${this.nature} property values must be either a Date or string (not ${typeof srcValue})`,
      );
      return;
    }

    const dateTime = moment.moment(
      srcValue,
      this.momentFormat,
      true,
    );
    if (!dateTime.isValid()) {
      reportError(
        this,
        srcPropName,
        srcValue,
        srcContent,
        srcContentIndex,
        `[DateTimeProperty] ${this.nature} property values must be formatted as '${this.momentFormat}'`,
      );
      return;
    }
    if (destination) {
      c.assignDest(
        this,
        srcPropName,
        dateTime.toDate(),
        destination,
        destFieldName,
      );
    }
  }

  static defaultDateFormats: DateConstraint[] = [
    { tryMomentFormat: "YYYY-MM-DD" },
    { tryMomentFormat: "DD/MM/YYYY" },
    { tryMomentFormat: "YYYY-MM-DD HH:MM:SS" },
    { tryMomentFormat: "YYYY-MM-DD HH:MM:SSZ" },
    { tryMomentFormat: "ddd MMM DD HH:mm:ss UTC YYYY" },
    { tryMomentFormat: moment.moment.ISO_8601 },
    { tryMomentFormat: moment.moment.RFC_2822 },
  ];

  static isDateTime(
    guessFrom: string,
    options: PropertyDefnGuesser,
  ): DateTimeProperty | false {
    const formats = [
      ...(options.guessFromAdditionalDateFormats || []),
      ...(options.guessFromOnlyDateFormats || this.defaultDateFormats),
    ];
    for (const gdf of formats) {
      const value = moment.moment(guessFrom, gdf.tryMomentFormat, true);
      if (value.isValid()) {
        return new DateTimeProperty(
          options.valueIsRequired,
          typeof gdf.tryMomentFormat === "string"
            ? gdf.tryMomentFormat
            : value.format(),
          false,
          gdf,
          options,
        );
      }
    }
    return false;
  }
}
