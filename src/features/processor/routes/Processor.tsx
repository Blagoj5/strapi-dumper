import clsx from "clsx";
import isHTML from "is-html";
import React, { useState } from "react";
import { RemoveIcon } from "../../../../assets/RemoveIcon";
import Button from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Subtitle, Text } from "../../../components/Typography";
import { getUrlToJson } from "../../../utils/downloadObjectAsJson";
import { StrapiSchema } from "../components/StrapiSchema";
import { reserverdFields, subReserveredFields } from "../consts/reservedFields";
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
  StrapiTypes,
} from "../consts/types";

type Props = {
  jsonData: Record<string, unknown>;
};

const getAvailableKeys = (jsonData: Record<string, unknown>) => {
  // new Set<string>
  const availableKeysMap: Record<string, Set<string>> = {};
  Object.entries(jsonData).forEach(([entity, entityData]) => {
    availableKeysMap[entity] = new Set<string>();
    const dataPerEntity = parseArray(entityData);
    if (!parseArray(dataPerEntity)) return;
    dataPerEntity.forEach((entityObject) => {
      const parsedEntityObject = parseObject(entityObject);
      Object.keys(parsedEntityObject).forEach((availableKey) => {
        availableKeysMap[entity].add(availableKey);
      });
    });
  });
  return availableKeysMap;
};

const getFieldType = (value: unknown): StrapiTypes => {
  if (isDate(value)) return StrapiTypes.Date;
  if (isString(value) && isHTML(value)) return StrapiTypes.RichText;
  if (isString(value)) return StrapiTypes.String;
  if (isFile(value)) return StrapiTypes.Media;
  if (isComponent(value)) return StrapiTypes.Component;
  if (isNumber(value)) return StrapiTypes.Number;
  if (isBoolean(value)) return StrapiTypes.Boolean;
  if (isNullish(value)) return StrapiTypes.Nullish;
  return StrapiTypes.Unknown;
};

export const Processor = ({ jsonData }: Props) => {
  const [schema, setSchema] = useState<Schema>();
  const [processedModels, setProcessedModels] = useState<ProcessedModel[]>([]);

  const disabled = Object.keys(jsonData).length === 0;
  const showProcessed = !disabled;

  const handleProcess = () => {
    const formedSchema: Schema = {};

    // new Set<string>
    const availableKeysMap = getAvailableKeys(jsonData);

    Object.entries(availableKeysMap).forEach(([entity, fields]) => {
      const keyToTypeMap: Schema[string] = {};
      fields.forEach((field) => {
        const dataPerEntity = parseArray(jsonData[entity]);
        let isRequired = true;

        let isUniqueString = true;
        const uniqueValues: string[] = [];
        dataPerEntity.forEach((entityObject) => {
          const parsedEntityObject = parseObject(entityObject);

          const availableValue = parsedEntityObject[field];

          // if it's missing available value
          if (!availableValue) isRequired = false;

          const fieldType = getFieldType(availableValue);

          if (isString(availableValue) && uniqueValues.includes(availableValue))
            isUniqueString = false;

          keyToTypeMap[field] = {
            type: fieldType,
            required: isRequired,
            unique: false,
            subFields: keyToTypeMap[field]?.subFields,
          };

          // if it's a component it contains subfields
          if (fieldType === StrapiTypes.Component && availableValue) {
            const componentFields = parseObject(availableValue);
            const subFields = Object.keys(componentFields);
            subFields.forEach((subField) => {
              if (subReserveredFields.includes(subField)) return;

              const subFieldType = getFieldType(componentFields[subField]);
              if (!keyToTypeMap[field]?.subFields) {
                keyToTypeMap[field].subFields = {};
              }

              keyToTypeMap[field].subFields = {
                ...keyToTypeMap[field].subFields,
                [subField]: {
                  type: subFieldType,
                  required: false,
                  unique: false,
                },
              };
            });
          }

          if (fieldType === StrapiTypes.String && isString(availableValue)) {
            keyToTypeMap[field].unique = isUniqueString;
            uniqueValues.push(availableValue);
          }

          // TODO: worried about this
          // isString(availableValue) &&
          // keyToTypeMap[field]?.type !== StrapiTypes.RichText
        });
      });

      formedSchema[entity] = keyToTypeMap;
    });

    setSchema(formedSchema);
  };

  const handleFieldRemove = (entity: string, field: string) => {
    const newSchema = { ...schema };
    delete newSchema[entity][field];
    setSchema(newSchema);
  };

  const handleSchemaGeneration = () => {
    if (!schema) return;

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

      Object.entries(entityField)
        .filter(
          ([field, fieldValue]) =>
            ![StrapiTypes.Unknown, StrapiTypes.Nullish].includes(
              fieldValue.type
            ) && !reserverdFields.includes(field)
        )
        .forEach(([field, fieldValue]) => {
          attributes[field] = { ...fieldValue };

          if (fieldValue.type === StrapiTypes.Component) {
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

          if (fieldValue.type === StrapiTypes.Media) {
            attributes[field].multiple = false; // TODO: add this option
            attributes[field].allowedTypes = ["images"]; // TODO: handle this option
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

    setProcessedModels(formedSchemas);
  };

  const handleFieldFlagToggle = (
    {
      isChecked,
      entity,
      field,
    }: {
      isChecked: boolean;
      entity: string;
      field: string;
    },
    flagField: "unique" | "required"
  ) => {
    const entityValue = schema?.[entity];
    const fieldValue = entityValue?.[field];
    if (!fieldValue || !entityValue) return;
    setSchema({
      ...schema,
      [entity]: {
        ...entityValue,
        [field]: {
          ...fieldValue,
          [flagField]: isChecked,
        },
      },
    });
  };

  const handleRequired = (args: {
    isChecked: boolean;
    entity: string;
    field: string;
  }) => {
    handleFieldFlagToggle(args, "required");
  };

  const handleUnique = (args: {
    isChecked: boolean;
    entity: string;
    field: string;
  }) => {
    handleFieldFlagToggle(args, "unique");
  };

  const handleMapping = () => {};

  return (
    <div className="mt-8">
      <Button onClick={handleProcess} disabled={disabled}>
        Process Schema
      </Button>

      {showProcessed && schema && (
        <>
          <Subtitle>Schemas</Subtitle>
          {Object.entries(schema).map(([entity, entitySchema]) => (
            <div key={entity}>
              <Text className="uppercase text-white font-bold p-2">
                * {entity}
              </Text>
              <div className="flex items-center border-b border-primary py-4 mb-4">
                <Text className="w-40 font-bold flex-shrink-0">Field</Text>
                <Text className="w-40 font-bold flex-shrink-0">Type</Text>
                <Text className="w-40 font-bold flex-shrink-0">Map To</Text>
                <Text className="w-40 font-bold flex-shrink-0">Required</Text>
                <Text className="w-40 font-bold flex-shrink-0">Unique</Text>
                <Text className="w-40 font-bold flex-shrink-0">Remove</Text>
              </div>
              <div className="flex flex-col gap-2">
                <StrapiSchema
                  schema={entitySchema}
                  handleFieldRemove={({ field }) =>
                    handleFieldRemove(entity, field)
                  }
                  handleRequired={(args) =>
                    handleRequired({
                      ...args,
                      entity,
                    })
                  }
                  handleUnique={(args) =>
                    handleUnique({
                      ...args,
                      entity,
                    })
                  }
                />
              </div>
            </div>
          ))}
        </>
      )}

      <div className="flex items-center gap-6 mt-4">
        <Text> Reserverd Fields </Text>
        <Input
          value={reserverdFields.join(", ")}
          onChange={() => {}}
          disabled
        />
      </div>

      {schema && (
        <Button className="mt-4" onClick={handleSchemaGeneration}>
          Generate models schema
        </Button>
      )}

      <Subtitle>Generated Strapi Schemas</Subtitle>

      <ul className="list-outside list-disc">
        {processedModels.map((processedModel) => (
          <li key={processedModel.fileName}>
            <a
              className="text-blue-500"
              href={processedModel.url}
              download={processedModel.fileName}
            >
              {processedModel.fileName}
            </a>
            <Text className="text-gray-400 text-sm">
              (HINT: Move to {processedModel.hint})
            </Text>
          </li>
        ))}
      </ul>

      {processedModels && <Subtitle className="mt-4">Mapping</Subtitle>}

      <Button className="mt-4" onClick={handleMapping}>
        Start Mapping
      </Button>
    </div>
  );
};
