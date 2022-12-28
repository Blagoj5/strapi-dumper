import isHTML from "is-html";
import {
  isBoolean,
  isComponent,
  isDate,
  isFile,
  isNullish,
  isNumber,
  isString,
  parseArray,
  parseObject,
  StrapiType,
} from "../consts/types";

export const getFieldType = (
  value: unknown
  // keyMap: Field | undefined
): StrapiType => {
  if (isDate(value)) return StrapiType.Date;
  if (isString(value) && isHTML(value)) return StrapiType.RichText;
  if (isString(value)) return StrapiType.String;
  if (isFile(value)) return StrapiType.Media;
  if (isComponent(value))
    return StrapiType.Component;
  if (isNumber(value)) return StrapiType.Number;
  if (isBoolean(value)) return StrapiType.Boolean;
  if (isNullish(value)) return StrapiType.Nullish;
  return StrapiType.Unknown;
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
