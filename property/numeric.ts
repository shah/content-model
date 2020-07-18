import { inflect } from "../deps.ts";
import { PropertyDefnGuesser } from "../guess.ts";
import {
  PropertyDefn,
  PropertyErrorHandler,
  PropertyName,
  PropertyNameTransformer,
  PropertyNature,
  PropertyValueRequired,
} from "../property.ts";
import * as v from "../values.ts";
import * as c from "./common.ts";

export abstract class NumericProperty implements PropertyDefn {
  abstract readonly nature: PropertyNature;
  abstract readonly description: string;

  constructor(
    readonly valueRequired: PropertyValueRequired,
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
  }

  abstract transformValue(
    srcPropName: PropertyName,
    cvs: v.ContentValueSupplier,
    reportError: PropertyErrorHandler,
    destination?: v.ContentValuesDestination,
    destFieldName?: PropertyNameTransformer,
  ): void;

  static isNumber(
    guessFrom: v.ContentValueSupplier,
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
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.guessFromValue.contentIndex})`
      : " (supplied)";
    return `Any text that can be converted to an integer value${guessedFrom}`;
  }

  transformValue(
    srcPropName: PropertyName,
    cvs: v.ContentValueSupplier,
    reportError: PropertyErrorHandler,
    destination?: v.ContentValuesDestination,
    destFieldName?: PropertyNameTransformer,
  ): void {
    const [srcValue, required] = c.getSourceValueAndContinue(
      this,
      srcPropName,
      cvs,
    );
    if (!required) return;

    if (typeof srcValue === "number") {
      if (destination) {
        destination.assign(srcPropName, Math.round(srcValue), destFieldName);
        return;
      }
    }
    if (!(typeof srcValue === "string")) {
      reportError(
        this,
        srcPropName,
        srcValue,
        cvs,
        `[IntegerProperty] ${this.nature.inflect()} property values must be either a number or parseable string (not ${typeof srcValue})`,
      );
      return;
    }

    const destValue = parseInt(srcValue);
    if (typeof destValue !== "number") {
      reportError(
        this,
        srcPropName,
        destValue,
        cvs,
        `[IntegerProperty] ${this.nature.inflect()} property values must be parseable as an integer`,
      );
      return;
    }
    if (destination) {
      destination.assign(srcPropName, destValue, destFieldName);
    }
  }
}

export class FloatProperty extends NumericProperty {
  readonly nature: PropertyNature = inflect.guessCaseValue("Float");

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.guessFromValue.contentIndex})`
      : " (supplied)";
    return `Any text that can be converted to a float value${guessedFrom}`;
  }

  transformValue(
    srcPropName: PropertyName,
    cvs: v.ContentValueSupplier,
    reportError: PropertyErrorHandler,
    destination?: v.ContentValuesDestination,
    destFieldName?: PropertyNameTransformer,
  ): void {
    const [srcValue, required] = c.getSourceValueAndContinue(
      this,
      srcPropName,
      cvs,
    );
    if (!required) return;

    if (typeof srcValue === "number") {
      if (destination) {
        destination.assign(srcPropName, srcValue, destFieldName);
        return;
      }
    }
    if (!(typeof srcValue === "string")) {
      reportError(
        this,
        srcPropName,
        srcValue,
        cvs,
        `[FloatProperty] ${this.nature.inflect()} property values must be either a number or parseable string (not ${typeof srcValue})`,
      );
      return;
    }

    const destValue = parseFloat(srcValue);
    if (typeof destValue !== "number") {
      reportError(
        this,
        srcPropName,
        destValue,
        cvs,
        `[FloatProperty] ${this.nature.inflect()} property values must be parseable as a float`,
      );
      return;
    }
    if (destination) {
      destination.assign(srcPropName, destValue, destFieldName);
    }
  }
}
