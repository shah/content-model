import { inflect, moment } from "../deps.ts";
import { PropertyDefnGuesser } from "../guess.ts";
import {
  PropertyDefn,
  PropertyNature,
  PropertyValueRequired,
} from "../property.ts";
import * as v from "../values.ts";

export interface DateConstraint {
  readonly tryMomentFormat: string;
}

export class DateTimeProperty implements PropertyDefn {
  readonly nature: PropertyNature = inflect.guessCaseValue("DateTime");

  constructor(
    readonly valueRequired: PropertyValueRequired,
    readonly momentFormat?: string,
    readonly guessedContraint?: DateConstraint,
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
  }

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.guessFromValue.sourceCVS.contentIndex})`
      : " (supplied)";
    return this.momentFormat
      ? `Any text that matches MomentJS date format '${this.momentFormat}'${guessedFrom}`
      : `Any Date instance${guessedFrom}`;
  }

  transformValue(
    pvs: v.PropertyValueSupplier,
    pipe: v.ValuePipe,
    tr: v.ValueTransformer,
  ): void {
    const [srcValue, required] = v.getSourceValueAndContinue(pvs);
    if (!required) return;

    if (srcValue instanceof Date) {
      if (pipe.destination) {
        pipe.destination.assign(pvs.propName, srcValue);
        return;
      }
    }

    if (!(typeof srcValue === "string")) {
      tr.onPropError(
        pvs,
        `[DateTimeProperty] ${this.nature.inflect()} property values must be either a Date or string (not ${typeof srcValue})`,
      );
      return;
    }

    if (!this.momentFormat) {
      tr.onPropError(
        pvs,
        `[DateTimeProperty] ${this.nature.inflect()} property is a string but no MomentJS date format supplied.`,
      );
      return;
    }

    const dateTime = moment.moment(
      srcValue,
      this.momentFormat,
      true,
    );
    if (!dateTime.isValid()) {
      tr.onPropError(
        pvs,
        `[DateTimeProperty] ${this.nature.inflect()} property values must be formatted as '${this.momentFormat}'`,
      );
      return;
    }
    if (pipe.destination) {
      pipe.destination.assign(pvs.propName, dateTime.toDate());
    }
  }

  static defaultDateFormats: DateConstraint[] = [
    { tryMomentFormat: "YYYY-MM-DD" },
    { tryMomentFormat: "DD/MM/YYYY" },
    { tryMomentFormat: "YYYY-MM-DD HH:MM:SS" },
    { tryMomentFormat: "YYYY-MM-DD HH:MM:SSZ" },
    { tryMomentFormat: "YYYY-MM-DD HH:MM:SS UTC" },
    { tryMomentFormat: "ddd MMM DD HH:mm:ss UTC YYYY" },
    { tryMomentFormat: "ddd MMM DD HH:mm:ss UTC YYYY" },
    { tryMomentFormat: moment.moment.ISO_8601 },
    { tryMomentFormat: moment.moment.RFC_2822 },
  ];

  static isDateTime(
    guessFrom: v.ValueSupplier,
    options: PropertyDefnGuesser,
  ): DateTimeProperty | false {
    const valueRaw = guessFrom.valueRaw;
    if (valueRaw instanceof Date) {
      return new DateTimeProperty(options.valueIsRequired);
    }
    if (typeof valueRaw === "string") {
      const formats = [
        ...(options.guessFromAdditionalDateFormats || []),
        ...(options.guessFromOnlyDateFormats || this.defaultDateFormats),
      ];
      for (const gdf of formats) {
        const value = moment.moment(valueRaw, gdf.tryMomentFormat, true);
        if (value.isValid()) {
          return new DateTimeProperty(
            options.valueIsRequired,
            typeof gdf.tryMomentFormat === "string"
              ? gdf.tryMomentFormat
              : value.format(),
            gdf,
            options,
          );
        }
      }
    }
    return false;
  }
}
