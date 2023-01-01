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

export const getStrapiSchema = (schema: Schema) => {
    const formedSchemas: ProcessedModel[] = [];
    Object.entries(schema).forEach(([entity, entityField]) => {
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
      Object.entries(entityField)
        .filter(
          ([field, fieldValue]) =>
            ![StrapiType.Unknown, StrapiType.Nullish].includes(
              fieldValue.type
            ) && !reserverdFields.includes(field)
        )
        .forEach(([field, fieldValue]) => {
          switch (fieldValue.type) {
            case StrapiType.RelationOneToOne:
              attributes[field].type = "relation";
              attributes[field].relation = "oneToOne";
              attributes[field].target = `api::${field}.${field}`;
              break;
            default:
              attributes[field] = { ...fieldValue };

              if (fieldValue.type === StrapiType.Component) {
                delete attributes[field].subFields; // remove the previsouly spreaded subFields
                attributes[field].displayName = field;
                attributes[field].repeatable = false; // TODO: add this option
                attributes[field].component = `${field}.${field}`; // TODO: very imporant step for creation component schema, e.g socials.socials
                components.push({
                  collectionName: `components_${attributes[field].component}`, // e.g components_socials_socials
                  info: {
                    displayName: attributes[field].displayName,
                  },
                  options: {},
                  attributes: {},
                });

                if (fieldValue.subFields) {
                  Object.entries(fieldValue.subFields).forEach(
                    ([subField, subFieldValue]) => {
                      attributes[subField] = { ...subFieldValue };
                    }
                  );
                }
              }

              if (fieldValue.type === StrapiType.Media) {
                attributes[field].multiple = false; // TODO: add this option
                attributes[field].allowedTypes = ["images"]; // TODO: handle this option
              }

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
}
