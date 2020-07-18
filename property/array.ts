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

export class ObjectArrayProperty implements PropertyDefn {
  readonly nature: PropertyNature = inflect.guessCaseValue("Array");

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

    let itemIndex = 0;
    if (Array.isArray(srcValue)) {
      for (const sv of srcValue) {
        if (!(typeof sv === "object")) {
          reportError(
            this,
            srcPropName,
            srcValue,
            cvs,
            `[ObjectArrayProperty] ${this.nature.inflect()} item values must be an object (${itemIndex} is a ${typeof srcValue})`,
          );
          continue;
        }

        const svCVS: v.ContentValuesSupplier = {
          contentIndex: itemIndex,
          valueNames: Object.keys(sv),
          valueByName: (name: string): any => {
            return sv[name];
          },
        };

        const children: { [name: string]: any } = {};
        m.typedContentTransformer(
          this.model,
          svCVS,
          {
            contentIndex: svCVS.contentIndex,
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
      }
    } else {
      reportError(
        this,
        srcPropName,
        srcValue,
        cvs,
        `[ObjectArrayProperty] ${this.nature.inflect()} property values must be an array (item ${itemIndex} is ${typeof srcValue})`,
      );
      itemIndex++;
    }
  }

  static isArray(
    guessFrom: v.ContentValueSupplier,
    guesser: PropertyDefnGuesser,
  ): ObjectArrayProperty | false {
    const valueRaw = guessFrom.valueRaw;
    if (Array.isArray(valueRaw)) {
      const firstItemModel = guesser.modelGuesser.guessKeyValueModel(
        valueRaw[0],
      );
      if (firstItemModel) {
        return new ObjectArrayProperty(
          guesser.valueIsRequired,
          firstItemModel,
          guesser,
        );
      }
    }

    return false;
  }
}
