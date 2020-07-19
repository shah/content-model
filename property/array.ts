import { inflect } from "../deps.ts";
import { PropertyDefnGuesser } from "../guess.ts";
import * as m from "../model.ts";
import {
  PropertyDefn,
  PropertyNature,
  PropertyValueRequired,
} from "../property.ts";
import * as v from "../values.ts";

export class ObjectArrayProperty
  implements m.ContentModelSupplier, PropertyDefn {
  readonly isContentModelSupplier = true;
  readonly nature: PropertyNature = inflect.guessCaseValue("Array");

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

    let itemIndex = 0;
    if (Array.isArray(srcValue)) {
      const children: object[] = [];
      for (const childItemValue of srcValue) {
        if (!(typeof childItemValue === "object")) {
          tr.onPropError(
            pvs,
            `[ObjectArrayProperty] ${this.nature.inflect()} item values must be an object (${itemIndex} is a ${typeof srcValue})`,
          );
          continue;
        }

        const activeItemCSV = v.objectValuesSupplier(childItemValue);
        const childTransformer = tr.childrenTransfomer(this.model);
        const childPipe = v.objectPipe(
          activeItemCSV,
          childTransformer.transformPropName,
          itemIndex,
        );
        children.push(childPipe.instance);
        childTransformer.transformValues(childPipe);
      }
      if (pipe.destination) {
        pipe.destination.assign(pvs.propName, children);
      }
    } else {
      tr.onPropError(
        pvs,
        `[ObjectArrayProperty] ${this.nature.inflect()} property values must be an array (item ${itemIndex} is ${typeof srcValue})`,
      );
      itemIndex++;
    }
  }

  static isArray(
    guessFrom: v.ValueSupplier,
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
