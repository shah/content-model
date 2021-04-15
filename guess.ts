import * as m from "./model.ts";
import * as p from "./property.ts";
import { ObjectArrayProperty } from "./property/array.ts";
import { BooleanProperty } from "./property/boolean.ts";
import { NumericProperty } from "./property/numeric.ts";
import { ObjectProperty } from "./property/object.ts";
import { DateConstraint } from "./property/temporal.ts";
import {
  ConstrainedTextProperty,
  TextConstraint,
  TextProperty,
} from "./property/text.ts";
import { UnknownProperty } from "./property/unknown.ts";
import * as v from "./values.ts";

export interface GuessPropertyDefnSupplier {
  (
    guessFrom: v.ValueSupplier,
    guesser: PropertyDefnGuesser,
  ): p.PropertyDefn;
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
  readonly guessFromValue: v.ValueSupplier;
  readonly srcPropName: p.PropertyName;
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
    readonly guessFromValue: v.ValueSupplier,
    readonly srcPropName: p.PropertyName,
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
      return this.defaultPropDefnSupplier(this.guessFromValue, this);
    }
    return new TextProperty(
      this.valueIsRequired ? this.valueIsRequired : false,
      this,
    );
  }

  guessPropertyDefn(): p.PropertyDefn {
    const guessFrom = this.guessFromValue;
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

    result = ObjectArrayProperty.isArray(guessFrom, this);
    if (result) return result;

    result = ObjectProperty.isObject(guessFrom, this);
    if (result) return result;

    return this.defaultPropertyDefn();
  }
}

export interface ModelGuesserOptions {
  readonly keepOnlyProperties?: { [key: string]: () => boolean | boolean };
  readonly skipProperties?: { [key: string]: () => boolean | boolean };
  readonly forcePropertyDefn?: {
    [key: string]: () => p.PropertyDefn | p.PropertyDefn;
  };
  readonly requirePropertyValue?: { [key: string]: p.PropertyValueRequired };
  confirmGuess?(
    propName: p.PropertyName,
    guessedDefn: p.PropertyDefn,
    guessFrom: v.ValueSupplier,
    guesser: PropertyDefnGuesser,
  ): p.PropertyDefn;
}

export interface ModelGuesser extends ModelGuesserOptions {
  guessKeyValueModel(
    content: { [key: string]: unknown },
  ): m.ContentModel | undefined;
  guessDefnFromValues(cvs: v.ContentValuesSupplier): m.ContentModel;
  guessPropertyDefn(
    srcValue: v.ValueSupplier,
    srcPropName: p.PropertyName,
  ): p.PropertyDefn | undefined;

  unknowableFromInitialGuess?(
    propName: p.PropertyName,
    propDefn: p.PropertyDefn,
    guesser: PropertyDefnGuesser,
  ): void;
  keepSubsequentGuessAfterInitialGuess?(
    tr: v.ValueTransformer,
    model: m.ContentModel,
    newPVS: v.PropertyValueSupplier,
    pipe: v.ValuePipe,
  ): boolean;
}

export class TypicalModelGuesser implements ModelGuesser {
  readonly keepOnlyProperties?: { [key: string]: () => boolean | boolean };
  readonly skipProperties?: { [key: string]: () => boolean | boolean };
  readonly forcePropertyDefn?: {
    [key: string]: () => p.PropertyDefn | p.PropertyDefn;
  };
  readonly requirePropertyValue?: { [key: string]: p.PropertyValueRequired };
  readonly confirmGuess?: (
    propName: p.PropertyName,
    guessedDefn: p.PropertyDefn,
    guessFrom: v.ValueSupplier,
    options: PropertyDefnGuesser,
  ) => p.PropertyDefn;

  constructor(
    {
      keepOnlyProperties,
      skipProperties,
      forcePropertyDefn: overrideDefns,
      requirePropertyValue,
      confirmGuess,
    }: ModelGuesserOptions,
  ) {
    this.keepOnlyProperties = keepOnlyProperties;
    this.skipProperties = skipProperties;
    this.forcePropertyDefn = overrideDefns;
    this.requirePropertyValue = requirePropertyValue;
    this.confirmGuess = confirmGuess;
  }

  guessPropertyDefn(
    vs: v.ValueSupplier,
    srcPropName: p.PropertyName,
  ): p.PropertyDefn | undefined {
    if (this.skipProperties) {
      const skip = this.skipProperties[srcPropName];
      if (typeof skip === "function" ? skip() : skip) {
        return undefined;
      }
    }

    if (this.keepOnlyProperties) {
      const keep = this.keepOnlyProperties[srcPropName];
      if (!(typeof keep === "function" ? keep() : keep)) {
        return undefined;
      }
    }

    const forceDefn = this.forcePropertyDefn &&
      this.forcePropertyDefn[srcPropName];
    if (forceDefn) {
      return (typeof forceDefn === "function" ? forceDefn() : forceDefn);
    }

    const propGuesser = new TypicalPropertyDefnGuesser(
      this,
      vs,
      srcPropName,
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
        vs,
        propGuesser,
      )
      : guessed;
  }

  guessDefnFromValues(cvs: v.ContentValuesSupplier): m.ContentModel {
    const model: m.ContentModel = {};
    for (const propName of cvs.valueNames) {
      const value = cvs.valueByName(propName);
      const guessed = this.guessPropertyDefn(
        { sourceCVS: cvs, valueRaw: value },
        propName,
      );
      if (guessed) {
        model[propName] = guessed;
      }
    }
    return model;
  }

  keepSubsequentGuessAfterInitialGuess?(
    tr: v.ValueTransformer,
    model: m.ContentModel,
    newPVS: v.PropertyValueSupplier,
    pipe: v.ValuePipe,
  ): boolean {
    // this method is called when a property is unknown (blank) in the initial guess
    // (for example from first row of a CSV file) but a value becomes available in
    // a later row that gives us more information about the property definition so we
    // want to redefine the property to the new definition.
    model[newPVS.propName] = newPVS.propDefn;
    newPVS.propDefn.transformValue(
      newPVS,
      pipe,
      tr,
    );
    return true;
  }

  guessKeyValueModel(
    content: { [key: string]: unknown },
  ): m.ContentModel | undefined {
    if (!content) {
      return undefined;
    }

    const cvs: v.ContentValuesSupplier = {
      contentIndex: 0,
      valueNames: Object.keys(content),
      valueByName: (name: string): unknown => {
        return content[name];
      },
    };

    const model: m.ContentModel = {};
    for (const propName of Object.getOwnPropertyNames(content)) {
      const value = content[propName];
      const guessed = this.guessPropertyDefn(
        { sourceCVS: cvs, valueRaw: value },
        propName,
      );
      if (guessed) {
        model[propName] = guessed;
      }
    }

    return model;
  }
}
