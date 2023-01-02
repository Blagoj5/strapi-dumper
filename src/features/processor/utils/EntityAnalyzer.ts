import { getFieldType } from ".";
import { subReserveredFields } from "../consts/reservedFields";
import { Field, parseObject, StrapiType } from "../consts/types";

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

  getFieldInfo = (field: string, value: unknown): Field => {
    const fieldType = getFieldType(value);
    return {
      name: field,
      type: fieldType,
      required: true,
      unique: true,
      subFields: [],
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
      const subFieldIndex = fieldMap.subFields.findIndex(
        ({ name }) => name === subField
      );
      const subFieldInfo = this.analyzeField(
        subField,
        fieldMap.subFields[subFieldIndex],
        componentFields[subField]
      );
      if (subFieldIndex >= 0) fieldMap.subFields[subFieldIndex] = subFieldInfo;
      else fieldMap.subFields.push(subFieldInfo);
    });
  };

  analyzeField = (
    field: string,
    fieldMap: Field | undefined,
    value: unknown
  ): Field => {
    const isAnalyzedBefore = !!fieldMap;

    const initialFieldInfo = this.getFieldInfo(field, value);

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
          initialFieldInfo.type === StrapiType.RichText ||
          fieldMap.type === StrapiType.RichText
        ) {
          return { ...fieldMap, type: StrapiType.RichText };
        }
      }

      if (initialFieldInfo.type === StrapiType.Component) {
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

    if (initialFieldInfo.type === StrapiType.Component) {
      this.analyzeComponentField(field, initialFieldInfo, value);
    }

    return initialFieldInfo;
  };
}
