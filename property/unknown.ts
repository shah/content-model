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

export class UnknownProperty implements PropertyDefn {
  readonly nature: PropertyNature = "Unknown";
  readonly valueRequired: PropertyValueRequired = false;
  private guessedAgain: number = 0;

  constructor(
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
  }

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.guessFromValue.contentIndex}, retries: ${this.guessedAgain})`
      : " (supplied)";
    return `Unknown property${guessedFrom}`;
  }

  transformValue(
    srcPropName: PropertyName,
    cvs: v.ContentValueSupplier,
    reportError: PropertyErrorHandler,
    destination?: { [name: string]: any },
    destFieldName?: PropertyNameTransformer,
  ): void {
    const srcValueRaw = cvs.valueRaw;
    // since this is an unknown property, see if we are allowed to "guess again"
    // when additional data is available in the stream
    if (
      this.guessedBy &&
      this.guessedBy.modelGuesser.keepSubsequentGuessAfterInitialGuess
    ) {
      const newGuess = this.guessedBy.modelGuesser.guessPropertyDefn(
        cvs,
        srcPropName,
        srcValueRaw,
      );
      this.guessedAgain++;
      if (newGuess && !(newGuess instanceof UnknownProperty)) {
        const keep = this.guessedBy.modelGuesser
          .keepSubsequentGuessAfterInitialGuess(
            srcPropName,
            newGuess,
            cvs,
            reportError,
            destination,
            destFieldName,
          );
        if (keep) {
          // it's the job of the keepSubsequentGuessAfterInitialGuess method
          // to do the assignment / processing
          return;
        }
      }
    }
  }

  static isUnknowable(
    guessFrom: v.ContentValueSupplier,
    guesser: PropertyDefnGuesser,
  ): PropertyDefn | false {
    let valueRaw = guessFrom.valueRaw;
    if (
      valueRaw == undefined ||
      (typeof valueRaw === "string" && valueRaw.trim().length == 0)
    ) {
      const instance = guesser.unknownPropDefnSupplier
        ? guesser.unknownPropDefnSupplier(guessFrom, guesser)
        : new UnknownProperty(guesser);
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
