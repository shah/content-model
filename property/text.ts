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

export class TextProperty implements PropertyDefn {
  constructor(
    readonly valueRequired: PropertyValueRequired,
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
  }

  get nature(): PropertyNature {
    return "Text";
  }

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.srcContentIndex})`
      : " (assigned)";
    return `Any arbitrary text${guessedFrom}`;
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

    if (!(typeof srcValue === "string")) {
      reportError(
        this,
        srcPropName,
        srcValue,
        srcContent,
        srcContentIndex,
        `[TextProperty] ${this.nature} property values must be a string (not ${typeof srcValue})`,
      );
      return;
    }

    if (destination) {
      c.assignDest(this, srcPropName, srcValue, destination, destFieldName);
    }
  }
}

export interface TextConstraint {
  readonly constraintName: string;
  readonly regExp: RegExp;
}

export class ConstrainedTextProperty extends TextProperty {
  constructor(
    readonly valueRequired: PropertyValueRequired,
    readonly constraint: TextConstraint,
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
    super(valueRequired);
  }

  get nature(): PropertyNature {
    return this.constraint.constraintName;
  }

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.srcContentIndex})`
      : " (supplied)";
    return `Any text that matches RegExp ${this.constraint.regExp}${guessedFrom}`;
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

    if (!(typeof srcValue === "string")) {
      reportError(
        this,
        srcPropName,
        srcValue,
        srcContent,
        srcContentIndex,
        `[ConstrainedTextProperty] ${this.nature} property values must be a string (not ${typeof srcValue})`,
      );
      return;
    }

    if (!this.constraint.regExp.test(srcValue)) {
      reportError(
        this,
        srcPropName,
        srcValue,
        srcContent,
        srcContentIndex,
        `[ConstrainedTextProperty] ${this.nature} property values must be a string matching RegExp ${this.constraint.regExp}`,
      );
      return;
    }
    if (destination) {
      c.assignDest(this, srcPropName, srcValue, destination, destFieldName);
    }
  }

  static defaultTextFormats: TextConstraint[] = [
    {
      constraintName: "IP Address",
      regExp:
        /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/,
    },
    {
      constraintName: "E-mail Address",
      regExp: /^[A-za-z0-9._-]*@[A-za-z0-9_-]*\.[A-Za-z0-9.]*$/,
    },
    {
      constraintName: "Telephone Number",
      regExp: /^\+\d{2}\/\d{4}\/\d{6}$/,
    },
  ];

  static isConstrainedText(
    guessFrom: string,
    guesser: PropertyDefnGuesser,
  ): ConstrainedTextProperty | false {
    const formats = [
      ...(guesser.guessFromAdditionalTextFormats || []),
      ...(guesser.guessFromOnlyTextFormats || this.defaultTextFormats),
    ];
    for (const gtf of formats) {
      if (gtf.regExp.test(guessFrom)) {
        return new ConstrainedTextProperty(
          guesser.valueIsRequired,
          gtf,
          guesser,
        );
      }
    }
    return false;
  }
}
