import { inflect } from "../deps.ts";
import { PropertyDefnGuesser } from "../guess.ts";
import {
  PropertyNature,
  PropertyValueRequired,
} from "../property.ts";
import * as v from "../values.ts";
import { ConstrainedTextProperty, RegExpConstraint } from "./text.ts";

export class BooleanProperty extends ConstrainedTextProperty {
  public static booleanNatureName = inflect.guessCaseValue("Boolean");

  constructor(
    readonly valueRequired: PropertyValueRequired,
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
    super(valueRequired, {
      constraintName: BooleanProperty.booleanNatureName,
      regExp: /^(yes|no|true|false|on|off|0|1)$/,
    } as RegExpConstraint);
  }

  get nature(): PropertyNature {
    return BooleanProperty.booleanNatureName;
  }

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.guessFromValue.sourceCVS.contentIndex}')`
      : " (supplied)";
    return `Boolean value where 'yes', 'on', 'off', or '1' will be true, all others will be false ${guessedFrom}`;
  }

  transformValue(
    pvs: v.PropertyValueSupplier,
    pipe: v.ValuePipe,
    tr: v.ValueTransformer,
  ): void {
    const [srcValue, required] = v.getSourceValueAndContinue(pvs);
    if (!required) return;

    if (typeof srcValue === "boolean") {
      if (pipe.destination) {
        pipe.destination.assign(pvs.propName, srcValue);
        return;
      }
    }
    if (!(typeof srcValue === "string")) {
      tr.onPropError(
        pvs,
        `[BooleanProperty] ${this.nature.inflect()} property values must be either a boolean or string (not ${typeof srcValue})`,
      );
      return;
    }
    if (!this.constraint.matchesConstraint(srcValue)) {
      tr.onPropError(
        pvs,
        `[BooleanProperty] ${this.nature.inflect()} property values must be a string (yes, no, on, off, 0, 1, true, or false)`,
      );
      return;
    }
    if (pipe.destination) {
      const srcValueLC = srcValue.toLocaleLowerCase();
      const destValue = (srcValueLC === "1" || srcValueLC === "yes" ||
          srcValueLC === "true" ||
          srcValueLC === "on")
        ? true
        : false;
      pipe.destination.assign(pvs.propName, destValue);
    }
  }

  static isBoolean(
    guessFrom: v.ValueSupplier,
    guesser: PropertyDefnGuesser,
  ): BooleanProperty | false {
    const valueRaw = guessFrom.valueRaw;
    if (typeof valueRaw === "boolean") {
      return new BooleanProperty(
        guesser.valueIsRequired,
        guesser,
      );
    }

    if (typeof valueRaw === "string") {
      // When guessing, we don't check for 0 or 1 since those could be confused for NumericProperty derivatives.
      // However, in the actual transform() method we do test for 0 | 1 for completeness.
      if (/^(yes|no|true|false|on|off)$/.test(valueRaw)) {
        return new BooleanProperty(
          guesser.valueIsRequired,
          guesser,
        );
      }
    }
    return false;
  }
}
