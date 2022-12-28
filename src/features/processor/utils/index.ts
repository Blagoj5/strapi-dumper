import isHTML from "is-html";
import {
  Field,
  isBoolean,
  isComponent,
  isDate,
  isFile,
  isNullish,
  isNumber,
  isString,
  parseArray,
  parseObject,
  StrapiTypes,
} from "../consts/types";

export const getFieldType = (
  value: unknown
  // keyMap: Field | undefined
): StrapiTypes => {
  if (isDate(value)) return StrapiTypes.Date;
  if (isString(value) && isHTML(value)) return StrapiTypes.RichText;
  if (isString(value)) return StrapiTypes.String;
  if (isFile(value)) return StrapiTypes.Media;
  if (isComponent(value))
    return StrapiTypes.Component;
  if (isNumber(value)) return StrapiTypes.Number;
  if (isBoolean(value)) return StrapiTypes.Boolean;
  if (isNullish(value)) return StrapiTypes.Nullish;
  return StrapiTypes.Unknown;
};

export const getAvailableKeys = (jsonData: Record<string, unknown>) => {
  const availableKeys: {
    entity: string;
    fields: Set<string>;
  }[] = [];
  Object.entries(jsonData).forEach(([entity, entityData]) => {
    const dataPerEntity = parseArray(entityData);
    if (!parseArray(dataPerEntity)) return;
    dataPerEntity.forEach((entityObject) => {
      const parsedEntityObject = parseObject(entityObject);
      const availableKeysSet = new Set<string>();
      Object.keys(parsedEntityObject).forEach((availableKey) => {
        availableKeysSet.add(availableKey);
      });
      availableKeys.push({ entity, fields: availableKeysSet });
    });
  });
  return availableKeys;
};
