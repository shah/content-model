import { inflect } from "../deps.ts";
import { PropertyDefnGuesser } from "../guess.ts";
import * as m from "../model.ts";
import {
  PropertyDefn,
  PropertyNature,
  PropertyValueRequired,
} from "../property.ts";
import * as v from "../values.ts";
import { DateTimeProperty } from "./temporal.ts";

export class ObjectProperty implements m.ContentModelSupplier, PropertyDefn {
  readonly isContentModelSupplier = true;
  readonly nature: PropertyNature = inflect.guessCaseValue("Object");

  constructor(
    readonly valueRequired: PropertyValueRequired,
    readonly model: m.ContentModel,
    readonly guessedBy?: PropertyDefnGuesser,
  ) {
  }

  get description(): string {
    const guessedFrom = this.guessedBy
      ? ` (guessed from '${this.guessedBy.srcPropName}' row ${this.guessedBy.guessFromValue.sourceCVS.contentIndex})`
      : " (supplied)";
    return `Object instance${guessedFrom}`;
  }

  transformValue(
    pvs: v.PropertyValueSupplier,
    pipe: v.ValuePipe,
    tr: v.ValueTransformer,
  ): void {
    const [srcValue, required] = v.getSourceValueAndContinue(pvs);
    if (!required) return;

    if (typeof srcValue === "object") {
      const activeItemCSV = v.objectValuesSupplier(srcValue);
      const childTransformer = tr.childrenTransfomer(this.model);
      const childPipe = v.objectPipe(
        activeItemCSV,
        childTransformer.transformPropName,
        pvs.sourceCVS.contentIndex,
      );
      childTransformer.transformValues(childPipe);
      if (pipe.destination) {
        pipe.destination.assign(pvs.propName, childPipe.instance);
      }
    } else {
      tr.onPropError(
        pvs,
        `[ObjectProperty] ${this.nature.inflect()} property values must be an object (not ${typeof srcValue})`,
      );
    }
  }

  static isObject(
    guessFrom: v.ValueSupplier,
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
