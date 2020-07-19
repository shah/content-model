import { inflect } from "../deps.ts";
import { PropertyDefnGuesser } from "../guess.ts";
import {
  PropertyDefn,
  PropertyNature,
  PropertyValueRequired,
} from "../property.ts";
import * as v from "../values.ts";
import * as m from "../model.ts";

export enum UnknownPropertyType {
  Scalar,
  Array,
  Object,
}

export class UnknownProperty implements PropertyDefn {
  readonly nature: PropertyNature = inflect.guessCaseValue("Unknown");
  readonly valueRequired: PropertyValueRequired = false;
  private guessedAgain: number = 0;

  constructor(
    readonly propertyType: UnknownPropertyType,
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
  }

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.guessFromValue.sourceCVS.contentIndex}, retries: ${this.guessedAgain})`
      : " (supplied)";
    return `Unknown property${guessedFrom}`;
  }

  transformValue(
    pvs: v.PropertyValueSupplier,
    pipe: v.ValuePipe,
    tr: v.ValueTransformer,
  ): void {
    const model = m.isContentModelSupplier(pvs.propDefn)
      ? pvs.propDefn.model
      : (m.isContentModelSupplier(tr) ? tr.model : undefined);
    // since this is an unknown property, see if we are allowed to "guess again"
    // when additional data is available in the stream
    if (
      model &&
      this.guessedBy &&
      this.guessedBy.modelGuesser.keepSubsequentGuessAfterInitialGuess
    ) {
      const newGuessCVS = { sourceCVS: pvs.sourceCVS, valueRaw: pvs.valueRaw };
      const newGuess = this.guessedBy.modelGuesser.guessPropertyDefn(
        newGuessCVS,
        pvs.propName,
      );
      this.guessedAgain++;
      if (newGuess && !(newGuess instanceof UnknownProperty)) {
        const newPVS: v.PropertyValueSupplier = {
          propDefn: newGuess,
          propName: pvs.propName,
          sourceCVS: pvs.sourceCVS,
          valueRaw: pvs.valueRaw,
        };
        if (model) {
          const keep = this.guessedBy.modelGuesser
            .keepSubsequentGuessAfterInitialGuess(tr, model, newPVS, pipe);
          if (keep) {
            // it's the job of the keepSubsequentGuessAfterInitialGuess method
            // to do the assignment / processing
            return;
          }
        }
      }
    }
  }

  static isUnknowable(
    guessFrom: v.ValueSupplier,
    guesser: PropertyDefnGuesser,
  ): PropertyDefn | false {
    let valueRaw = guessFrom.valueRaw;
    if (
      valueRaw == undefined || valueRaw == null ||
      (typeof valueRaw === "string" && valueRaw.trim().length == 0) ||
      (Array.isArray(valueRaw) && valueRaw.length == 0) ||
      (typeof valueRaw === "object" &&
        Object.getOwnPropertyNames(valueRaw).length == 0)
    ) {
      const propertyType = Array.isArray(valueRaw)
        ? UnknownPropertyType.Array
        : (valueRaw == null
          ? UnknownPropertyType.Scalar
          : (typeof valueRaw === "object"
            ? UnknownPropertyType.Object
            : UnknownPropertyType.Scalar));
      const instance = guesser.unknownPropDefnSupplier
        ? guesser.unknownPropDefnSupplier(guessFrom, guesser)
        : new UnknownProperty(propertyType, guesser);
      if (guesser.modelGuesser.unknowableFromInitialGuess) {
        guesser.modelGuesser.unknowableFromInitialGuess(
          guesser.srcPropName,
          instance,
          guesser,
        );
      }
      return instance;
    }
    return false;
  }
}
