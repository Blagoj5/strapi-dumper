import { getFieldType } from ".";
import { subReserveredFields } from "../consts/reservedFields";
import { Field, parseObject, StrapiTypes } from "../consts/types";

export class EntityAnalyzer {
  subFieldsAvailableKeys: { [objectField: string]: Set<string> };

  constructor() {
    this.subFieldsAvailableKeys = {};
  }

  setSubField = (componentField: string, subField: string) => {
    if (this.subFieldsAvailableKeys[componentField]) {
      this.subFieldsAvailableKeys[componentField].add(subField);
      return;
    }
    this.subFieldsAvailableKeys = {
      [componentField]: new Set([subField]),
    };
  };

  getFieldInfo = (value: unknown): Field => {
    const fieldType = getFieldType(value);
    return {
      type: fieldType,
      required: true,
      unique: true,
      subFields: {},
    };
  };

  analyzeComponentField = (field: string, fieldMap: Field, value: unknown) => {
    const componentFields = parseObject(value);
    const subFields = Object.keys(componentFields);
    // need to know all possible subfields
    subFields
      .filter((subField) => !subReserveredFields.includes(subField))
      .forEach((subField) => {
        this.setSubField(field, subField);
      });
    this.subFieldsAvailableKeys[field].forEach((subField) => {
      const subFieldInfo = this.analyzeField(
        field,
        fieldMap?.subFields[subField],
        componentFields[subField]
      );
      fieldMap.subFields[subField] = subFieldInfo;
    });
  };

  analyzeField = (
    field: string,
    fieldMap: Field | undefined,
    value: unknown
  ): Field => {
    const isAnalyzedBefore = !!fieldMap;

    const initialFieldInfo = this.getFieldInfo(value);

    if (isAnalyzedBefore) {
      // if it doesn't have value -> it's not required
      if (!value) {
        return {
          ...fieldMap,
          required: false,
        };
      }

      // new and old type do not match
      if (initialFieldInfo.type !== fieldMap.type) {
        // special case
        if (
          initialFieldInfo.type === StrapiTypes.RichText ||
          fieldMap.type === StrapiTypes.RichText
        ) {
          return { ...fieldMap, type: StrapiTypes.RichText };
        }
      }

      if (initialFieldInfo.type === StrapiTypes.Component) {
        this.analyzeComponentField(field, fieldMap, value);
      }

      return fieldMap;
    }

    // if it doesn't have value -> it's not required
    if (!value) {
      return {
        ...initialFieldInfo,
        required: false,
      };
    }

    if (initialFieldInfo.type === StrapiTypes.Component) {
      this.analyzeComponentField(field, initialFieldInfo, value);
    }

    return initialFieldInfo;
  };
}
