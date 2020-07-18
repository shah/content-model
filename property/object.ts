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
import * as m from "../model.ts";
import { DateTimeProperty } from "./temporal.ts";

export class ObjectProperty implements PropertyDefn {
  readonly nature: PropertyNature = inflect.guessCaseValue("Object");

  constructor(
    readonly valueRequired: PropertyValueRequired,
    readonly model: m.ContentModel,
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
  }

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.guessFromValue.contentIndex})`
      : " (supplied)";
    return `Object instance${guessedFrom}`;
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

    if (typeof srcValue === "object") {
      const children: { [name: string]: any } = {};
      m.typedContentTransformer(
        this.model,
        cvs,
        {
          contentIndex: cvs.contentIndex,
          assign: (
            name: string,
            value: any,
            transform: (name: string) => string,
          ): void => {
            const valueName = transform ? transform(name) : name;
            children[valueName] = value;
          },
        },
        m.consoleErrorHandler,
      );
      if (destination) {
        destination.assign(srcPropName, children, destFieldName);
      }
    } else {
      reportError(
        this,
        srcPropName,
        srcValue,
        cvs,
        `[ObjectProperty] ${this.nature.inflect()} property values must be an object (not ${typeof srcValue})`,
      );
    }
  }

  static isObject(
    guessFrom: v.ContentValueSupplier,
    guesser: PropertyDefnGuesser,
  ): ObjectProperty | DateTimeProperty | false {
    let result: PropertyDefn | false = DateTimeProperty.isDateTime(
      guessFrom,
      guesser,
    );
    if (result) return result;

    if (typeof guessFrom.valueRaw === "object") {
      const childModel = guesser.modelGuesser.guessKeyValueModel(
        guessFrom.valueRaw,
      );
      if (childModel) {
        return new ObjectProperty(guesser.valueIsRequired, childModel, guesser);
      }
    }

    return false;
  }
}
