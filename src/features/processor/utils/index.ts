import isHTML from "is-html";
import { getUrlToJson } from "../../../utils/downloadObjectAsJson";
import { reserverdFields } from "../consts/reservedFields";
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
  ProcessedModel,
  Schema,
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
  if (isComponent(value)) return StrapiType.Component;
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
    const availableKeysSet = new Set<string>();
    dataPerEntity.forEach((entityObject) => {
      const parsedEntityObject = parseObject(entityObject);
      Object.keys(parsedEntityObject).forEach((availableKey) => {
        availableKeysSet.add(availableKey);
      });
    });
    availableKeys.push({ entity, fields: availableKeysSet });
  });
  return availableKeys;
};

export const getStrapiSchema = (schema: Schema) => {
  const formedSchemas: ProcessedModel[] = [];
  Object.entries(schema).forEach(([entity, fields]) => {
    // e.g categories => category, choices => choice
    const singularEntity = entity.endsWith("ies")
      ? `${entity.slice(0, -3)}y`
      : entity.slice(0, -1);

    const formedSchema: Record<string, any> = {
      kind: "collectionType",
      collectionName: entity,
      info: {
        singularName: singularEntity,
        displayName: singularEntity,
        pluralName: entity,
      },
      options: {
        draftAndPublish: true,
      },
      pluginOptions: {},
    };

    const attributes: Record<string, any> = {};
    const components: Record<string, any>[] = [];

    // TODO: make abstraction
    fields
      .filter(
        (field) =>
          ![StrapiType.Unknown, StrapiType.Nullish].includes(field.type) &&
          !reserverdFields.includes(field.name)
      )
      .forEach((field) => {
        switch (field.type) {
          case StrapiType.RelationOneToOne:
            attributes[field.name] = {};
            attributes[field.name].type = "relation";
            attributes[field.name].relation = "oneToOne";
            attributes[field.name].target = `api::${field}.${field}`;
            break;

          case StrapiType.Media:
            attributes[field.name] = {
              type: field.type,
              unique: field.unique,
              required: field.required,
            };
            attributes[field.name].multiple = false; // TODO: add this option
            attributes[field.name].allowedTypes = ["images"]; // TODO: handle this option
            break;

          case StrapiType.Component:
            attributes[field.name] = {
              type: field.type,
              unique: field.unique,
              required: field.required,
            };
            attributes[field.name].displayName = field.name;
            attributes[field.name].repeatable = false; // TODO: add this option
            attributes[field.name].component = `${field.name}.${field.name}`; // TODO: very imporant step for creation component schema, e.g socials.socials
            components.push({
              collectionName: `components_${attributes[field.name].component}`, // e.g components_socials_socials
              info: {
                displayName: attributes[field.name].displayName,
              },
              options: {},
              attributes: {},
            });

            if (field.subFields) {
              field.subFields.forEach((subField) => {
                attributes[subField.name] = {
                  type: subField.type,
                  required: subField.required,
                  unique: subField.unique,
                };
              });
            }
            break;

          default:
            attributes[field.name] = {
              type: field.type,
              unique: field.unique,
              required: field.required,
            };
            break;
        }
      });

    formedSchema.attributes = attributes;

    formedSchemas.push({
      entityName: entity,
      fileName: "schema.json",
      url: getUrlToJson(formedSchema),
      hint: `ROOT_DIR/src/api/${singularEntity}/content-types/${singularEntity}/schema.json`, //TODO: make dynamic
    });

    formedSchemas.push(
      ...components.map((component) => ({
        entityName: component.info.displayName,
        fileName: `${component.info.displayName}.json`,
        url: getUrlToJson(component),
        hint: `ROOT_DIR/src/components/${component.info.displayName}/socials.json`, //TODO: make dynamic
      }))
    );
  });

  return formedSchemas;
};
