import * as m from "./model.ts";
import * as p from "./property.ts";
import { BooleanProperty } from "./property/boolean.ts";
import { NumericProperty } from "./property/numeric.ts";
import { DateConstraint, DateTimeProperty } from "./property/temporal.ts";
import {
  ConstrainedTextProperty,
  TextConstraint,
  TextProperty,
} from "./property/text.ts";
import { UnknownProperty } from "./property/unknown.ts";

export interface GuessPropertyDefnSupplier {
  (guessFrom: string, guesser: PropertyDefnGuesser): p.PropertyDefn;
}

export interface PropertyDefnGuesserOptions {
  readonly defaultPropDefnSupplier?: GuessPropertyDefnSupplier;
  readonly unknownPropDefnSupplier?: GuessPropertyDefnSupplier;
  readonly guessFromOnlyDateFormats?: DateConstraint[];
  readonly guessFromOnlyTextFormats?: TextConstraint[];
  readonly guessFromAdditionalDateFormats?: DateConstraint[];
  readonly guessFromAdditionalTextFormats?: TextConstraint[];
}

export interface PropertyDefnGuesser extends PropertyDefnGuesserOptions {
  readonly modelGuesser: ModelGuesser;
  readonly guessFromPropValue: string;
  readonly srcPropName: p.PropertyName;
  readonly srcContentIndex: number;
  readonly valueIsRequired: p.PropertyValueRequired;

  guessPropertyDefn(): p.PropertyDefn;
}

export class TypicalPropertyDefnGuesser implements PropertyDefnGuesser {
  readonly defaultPropDefnSupplier?: GuessPropertyDefnSupplier;
  readonly unknownPropDefnSupplier?: GuessPropertyDefnSupplier;
  readonly guessFromOnlyDateFormats?: DateConstraint[];
  readonly guessFromOnlyTextFormats?: TextConstraint[];
  readonly guessFromAdditionalDateFormats?: DateConstraint[];
  readonly guessFromAdditionalTextFormats?: TextConstraint[];

  constructor(
    readonly modelGuesser: ModelGuesser,
    readonly guessFromPropValue: string,
    readonly srcPropName: p.PropertyName,
    readonly srcContentIndex: number,
    readonly valueIsRequired: p.PropertyValueRequired,
    {
      defaultPropDefnSupplier,
      unknownPropDefnSupplier,
      guessFromOnlyDateFormats,
      guessFromOnlyTextFormats,
      guessFromAdditionalDateFormats,
      guessFromAdditionalTextFormats,
    }: PropertyDefnGuesserOptions,
  ) {
    this.defaultPropDefnSupplier = defaultPropDefnSupplier;
    this.unknownPropDefnSupplier = unknownPropDefnSupplier;
    this.guessFromOnlyDateFormats = guessFromOnlyDateFormats;
    this.guessFromOnlyTextFormats = guessFromOnlyTextFormats;
    this.guessFromAdditionalDateFormats = guessFromAdditionalDateFormats;
    this.guessFromAdditionalTextFormats = guessFromAdditionalTextFormats;
  }

  defaultPropertyDefn(): p.PropertyDefn {
    if (this.defaultPropDefnSupplier) {
      return this.defaultPropDefnSupplier(this.guessFromPropValue, this);
    }
    return new TextProperty(
      this.valueIsRequired ? this.valueIsRequired : false,
      this,
    );
  }

  guessPropertyDefn(): p.PropertyDefn {
    const guessFrom = this.guessFromPropValue;
    let result: p.PropertyDefn | false = UnknownProperty.isUnknowable(
      guessFrom,
      this,
    );
    if (result) return result;

    result = NumericProperty.isNumber(guessFrom, this);
    if (result) return result;

    result = BooleanProperty.isBoolean(guessFrom, this);
    if (result) return result;

    result = ConstrainedTextProperty.isConstrainedText(guessFrom, this);
    if (result) return result;

    result = DateTimeProperty.isDateTime(guessFrom, this);
    if (result) return result;

    return this.defaultPropertyDefn();
  }
}

export interface ModelGuesserOptions {
  skipProperties?: { [key: string]: () => boolean | boolean };
  overrideDefns?: {
    [key: string]: () => p.PropertyDefn | p.PropertyDefn;
  };
  requirePropertyValue?: { [key: string]: p.PropertyValueRequired };
  confirmGuess?(
    propName: p.PropertyName,
    guessedDefn: p.PropertyDefn,
    guessFrom: string,
    guesser: PropertyDefnGuesser,
  ): p.PropertyDefn;
}

export interface ModelGuesser extends ModelGuesserOptions {
  readonly model: m.ContentModel;

  guessDefnFromContent(content: { [key: string]: any }): void;
  guessPropertyDefn(
    srcContentIndex: number,
    srcPropName: p.PropertyName,
    guessFromValue: string,
  ): p.PropertyDefn | undefined;

  unknowableFromInitialGuess?(
    propName: p.PropertyName,
    colDefn: p.PropertyDefn,
    guesser: PropertyDefnGuesser,
  ): void;
  keepSubsequentGuessAfterInitialGuess?(
    propName: p.PropertyName,
    colDefn: p.PropertyDefn,
    srcContentIndex: number,
    srcContent: { [propName: string]: any },
    reportError: p.PropertyErrorHandler,
    destination?: object,
    destFieldName?: p.PropertyNameTransformer,
  ): boolean;
}

export class TypicalModelGuesser implements ModelGuesser {
  readonly model: m.ContentModel = {};
  readonly keepProperties?: { [key: string]: () => boolean | boolean };
  readonly skipProperties?: { [key: string]: () => boolean | boolean };
  readonly overrideDefns?: {
    [key: string]: () => p.PropertyDefn | p.PropertyDefn;
  };
  readonly requirePropertyValue?: { [key: string]: p.PropertyValueRequired };
  readonly confirmGuess?: (
    propName: p.PropertyName,
    guessedDefn: p.PropertyDefn,
    guessFrom: string,
    options: PropertyDefnGuesser,
  ) => p.PropertyDefn;

  constructor(
    {
      skipProperties,
      overrideDefns,
      requirePropertyValue,
      confirmGuess,
    }: ModelGuesserOptions,
  ) {
    this.skipProperties = skipProperties;
    this.overrideDefns = overrideDefns;
    this.requirePropertyValue = requirePropertyValue;
    this.confirmGuess = confirmGuess;
  }

  guessPropertyDefn(
    srcContentIndex: number,
    srcPropName: p.PropertyName,
    guessFromValue: string,
  ): p.PropertyDefn | undefined {
    if (this.skipProperties) {
      const skip = this.skipProperties[srcPropName];
      if (typeof skip === "function" ? skip() : skip) {
        return undefined;
      }
    }

    if (this.keepProperties) {
      const keep = this.keepProperties[srcPropName];
      if (!(typeof keep === "function" ? keep() : keep)) {
        return undefined;
      }
    }

    const overrideDefn = this.overrideDefns &&
      this.overrideDefns[srcPropName];
    if (overrideDefn) {
      return (typeof overrideDefn === "function"
        ? overrideDefn()
        : overrideDefn);
    }

    const propGuesser = new TypicalPropertyDefnGuesser(
      this,
      guessFromValue,
      srcPropName,
      srcContentIndex,
      this.requirePropertyValue
        ? (srcPropName in this.requirePropertyValue
          ? this.requirePropertyValue[srcPropName]
          : false)
        : false,
      {},
    );
    const guessed = propGuesser.guessPropertyDefn();
    return this.confirmGuess
      ? this.confirmGuess(
        srcPropName,
        guessed,
        guessFromValue,
        propGuesser,
      )
      : guessed;
  }

  guessDefnFromContent(content: { [key: string]: any }): void {
    for (const property of Object.entries(content)) {
      const propName = property[0];
      const guessed = this.guessPropertyDefn(
        0,
        propName,
        property[1],
      );
      if (guessed) {
        this.model[propName] = guessed;
      }
    }
  }

  keepSubsequentGuessAfterInitialGuess(
    propName: p.PropertyName,
    colDefn: p.PropertyDefn,
    srcContentIndex: number,
    srcContent: { [propName: string]: any },
    reportError: p.PropertyErrorHandler,
    destination?: object,
    destFieldName?: p.PropertyNameTransformer,
  ): boolean {
    // this method is called when a property is unknown (blank) in the initial guess
    // (for example from first row of a CSV file) but a value becomes available in
    // a later row that gives us more information about the property definition so we
    // want to redefine the property to the new definition.
    this.model[propName] = colDefn;
    colDefn.transformValue(
      propName,
      srcContentIndex,
      srcContent,
      reportError,
      destination,
      destFieldName,
    );
    return true;
  }
}
