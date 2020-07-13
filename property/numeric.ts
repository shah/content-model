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
    srcContentIndex: number,
    srcContent: { [propName: string]: any },
    reportError: PropertyErrorHandler,
    destination?: object,
    destFieldName?: PropertyNameTransformer,
  ): void;

  static isNumber(
    guessFrom: string,
    guesser: PropertyDefnGuesser,
  ): NumericProperty | false {
    // remove comma separators and test if we have a number
    if (!isNaN(Number(guessFrom.replace(/,/g, "")))) {
      const float = parseFloat(guessFrom);
      const integer = parseInt(guessFrom);
      if (float === integer) {
        return new IntegerProperty(guesser.valueIsRequired, guesser);
      }
      return new FloatProperty(guesser.valueIsRequired, guesser);
    }
    return false;
  }
}

export class IntegerProperty extends NumericProperty {
  readonly nature: PropertyNature = "Integer";

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.srcContentIndex})`
      : " (supplied)";
    return `Any text that can be converted to an integer value${guessedFrom}`;
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

    if (typeof srcValue === "number") {
      if (destination) {
        c.assignDest(
          this,
          srcPropName,
          Math.round(srcValue),
          destination,
          destFieldName,
        );
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
        `[IntegerProperty] ${this.nature} property values must be either a number or parseable string (not ${typeof srcValue})`,
      );
      return;
    }

    const destValue = parseInt(srcValue);
    if (typeof destValue !== "number") {
      reportError(
        this,
        srcPropName,
        destValue,
        srcContent,
        srcContentIndex,
        `[IntegerProperty] ${this.nature} property values must be parseable as an integer`,
      );
      return;
    }
    if (destination) {
      c.assignDest(this, srcPropName, destValue, destination, destFieldName);
    }
  }
}

export class FloatProperty extends NumericProperty {
  readonly nature: PropertyNature = "Float";

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.srcContentIndex})`
      : " (supplied)";
    return `Any text that can be converted to a float value${guessedFrom}`;
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

    if (typeof srcValue === "number") {
      if (destination) {
        c.assignDest(
          this,
          srcPropName,
          srcValue,
          destination,
          destFieldName,
        );
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
        `[FloatProperty] ${this.nature} property values must be either a number or parseable string (not ${typeof srcValue})`,
      );
      return;
    }

    const destValue = parseFloat(srcValue);
    if (typeof destValue !== "number") {
      reportError(
        this,
        srcPropName,
        destValue,
        srcContent,
        srcContentIndex,
        `[FloatProperty] ${this.nature} property values must be parseable as a float`,
      );
      return;
    }
    if (destination) {
      c.assignDest(this, srcPropName, destValue, destination, destFieldName);
    }
  }
}
