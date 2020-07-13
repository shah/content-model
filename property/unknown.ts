import { PropertyDefnGuesser } from "../guess.ts";
import {
  PropertyDefn,
  PropertyErrorHandler,
  PropertyName,
  PropertyNameTransformer,
  PropertyNature,
  PropertyValueRequired,
} from "../property.ts";

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
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.srcContentIndex}, retried: ${this.guessedAgain})`
      : " (supplied)";
    return `Unknown property${guessedFrom}`;
  }

  transformValue(
    srcPropName: PropertyName,
    srcContentIndex: number,
    srcContent: { [propName: string]: any },
    reportError: PropertyErrorHandler,
    destination?: object,
    destFieldName?: PropertyNameTransformer,
  ): void {
    const srcValueRaw = srcContent[srcPropName];
    // since this is an unknown property, see if we are allowed to "guess again"
    // when additional data is available in the stream
    if (
      this.guessedBy &&
      this.guessedBy.modelGuesser.keepSubsequentGuessAfterInitialGuess
    ) {
      const newGuess = this.guessedBy.modelGuesser.guessPropertyDefn(
        srcContentIndex,
        srcPropName,
        srcValueRaw,
      );
      this.guessedAgain++;
      if (newGuess && !(newGuess instanceof UnknownProperty)) {
        const keep = this.guessedBy.modelGuesser
          .keepSubsequentGuessAfterInitialGuess(
            srcPropName,
            newGuess,
            srcContentIndex,
            srcContent,
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
    guessFrom: string,
    guesser: PropertyDefnGuesser,
  ): PropertyDefn | false {
    if (guessFrom.trim().length == 0) {
      const unknown = guesser.unknownPropDefnSupplier
        ? guesser.unknownPropDefnSupplier(guessFrom, guesser)
        : new UnknownProperty(guesser);
      if (guesser.modelGuesser.unknowableFromInitialGuess) {
        guesser.modelGuesser.unknowableFromInitialGuess(
          guesser.srcPropName,
          unknown,
          guesser,
        );
      }
      return unknown;
    }
    return false;
  }
}
