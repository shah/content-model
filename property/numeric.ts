import { inflect } from "../deps.ts";
import { PropertyDefnGuesser } from "../guess.ts";
import {
  PropertyDefn,
  PropertyNature,
  PropertyValueRequired,
} from "../property.ts";
import * as v from "../values.ts";

export abstract class NumericProperty implements PropertyDefn {
  abstract readonly nature: PropertyNature;
  abstract readonly description: string;

  constructor(
    readonly valueRequired: PropertyValueRequired,
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
  }

  abstract transformValue(
    pvs: v.PropertyValueSupplier,
    pipe: v.ValuePipe,
    tr: v.ValueTransformer,
  ): void;

  static isNumber(
    guessFrom: v.ValueSupplier,
    guesser: PropertyDefnGuesser,
  ): NumericProperty | false {
    const valueRaw = guessFrom.valueRaw;
    if (typeof valueRaw === "number") {
      if (Math.round(valueRaw) == valueRaw) {
        return new IntegerProperty(guesser.valueIsRequired, guesser);
      }
      return new FloatProperty(guesser.valueIsRequired, guesser);
    }

    if (typeof valueRaw === "string") {
      // remove comma separators and test if we have a number
      if (!isNaN(Number(valueRaw.replace(/,/g, "")))) {
        const float = parseFloat(guessFrom.valueRaw);
        const integer = parseInt(guessFrom.valueRaw);
        if (float === integer) {
          return new IntegerProperty(guesser.valueIsRequired, guesser);
        }
        return new FloatProperty(guesser.valueIsRequired, guesser);
      }
    }
    return false;
  }
}

export class IntegerProperty extends NumericProperty {
  readonly nature: PropertyNature = inflect.guessCaseValue("Integer");

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.guessFromValue.sourceCVS.contentIndex})`
      : " (supplied)";
    return `Any text that can be converted to an integer value${guessedFrom}`;
  }

  transformValue(
    pvs: v.PropertyValueSupplier,
    pipe: v.ValuePipe,
    tr: v.ValueTransformer,
  ): void {
    const [srcValue, required] = v.getSourceValueAndContinue(pvs);
    if (!required) return;

    if (typeof srcValue === "number") {
      if (pipe.destination) {
        pipe.destination.assign(pvs.propName, Math.round(srcValue));
        return;
      }
    }
    if (!(typeof srcValue === "string")) {
      tr.onPropError(
        pvs,
        `[IntegerProperty] ${this.nature.inflect()} property values must be either a number or parseable string (not ${typeof srcValue})`,
      );
      return;
    }

    const destValue = parseInt(srcValue);
    if (typeof destValue !== "number") {
      tr.onPropError(
        pvs,
        `[IntegerProperty] ${this.nature.inflect()} property values must be parseable as an integer`,
      );
      return;
    }
    if (pipe.destination) {
      pipe.destination.assign(pvs.propName, destValue);
    }
  }
}

export class FloatProperty extends NumericProperty {
  readonly nature: PropertyNature = inflect.guessCaseValue("Float");

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.guessFromValue.sourceCVS.contentIndex})`
      : " (supplied)";
    return `Any text that can be converted to a float value${guessedFrom}`;
  }

  transformValue(
    pvs: v.PropertyValueSupplier,
    pipe: v.ValuePipe,
    tr: v.ValueTransformer,
  ): void {
    const [srcValue, required] = v.getSourceValueAndContinue(pvs);
    if (!required) return;

    if (typeof srcValue === "number") {
      if (pipe.destination) {
        pipe.destination.assign(pvs.propName, srcValue);
        return;
      }
    }
    if (!(typeof srcValue === "string")) {
      tr.onPropError(
        pvs,
        `[FloatProperty] ${this.nature.inflect()} property values must be either a number or parseable string (not ${typeof srcValue})`,
      );
      return;
    }

    const destValue = parseFloat(srcValue);
    if (typeof destValue !== "number") {
      tr.onPropError(
        pvs,
        `[FloatProperty] ${this.nature.inflect()} property values must be parseable as a float`,
      );
      return;
    }
    if (pipe.destination) {
      pipe.destination.assign(pvs.propName, destValue);
    }
  }
}
