import axios from "axios";
import isHTML from "is-html";
import React, { useState } from "react";
import Button from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Subtitle, Text } from "../../../components/Typography";
import { useLoadconfig } from "../../../hooks/useLoadConfig";
import { getUrlToJson } from "../../../utils/downloadObjectAsJson";
import { StaticStrapiSchema } from "../components/StaticStrapiSchema";
import { StrapiSchema } from "../components/StrapiSchema";
import { reserverdFields, subReserveredFields } from "../consts/reservedFields";
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
  parseComponent,
  parseFile,
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

const getFieldType = (value: unknown, keyMap: Field | undefined): StrapiTypes => {
  if (isDate(value)) return StrapiTypes.Date;
  // it was previously a rich text, but right now it's a string (it does not contain html)
  if (isString(value) && isHTML(value) || keyMap?.type === StrapiTypes.RichText) return StrapiTypes.RichText;
  if (isString(value)) return StrapiTypes.String;
  if (isFile(value)) return StrapiTypes.Media;
  // if the previous type was component even tho it's null it's still of type component but not required
  if (isComponent(value) || keyMap?.type === StrapiTypes.Component) return StrapiTypes.Component;
  if (isNumber(value)) return StrapiTypes.Number;
  if (isBoolean(value)) return StrapiTypes.Boolean;
  if (isNullish(value)) return StrapiTypes.Nullish;
  return StrapiTypes.Unknown;
};

export const Processor = ({ jsonData }: Props) => {
  const [schema, setSchema] = useState<Schema>();
  const [processedModels, setProcessedModels] = useState<ProcessedModel[]>([]);
  const { migrationEndpoint, endpoint } = useLoadconfig();

  const [isLoading, setIsLoading] = useState(false);

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

          const fieldType = getFieldType(availableValue, keyToTypeMap[field]);

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

              const subFieldType = getFieldType(componentFields[subField], keyToTypeMap[field].subFields?.[subField]);
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

  const handleMapping = async () => {
    setIsLoading(true);
    try {
      if (!schema) return;

      const entities = Object.keys(schema);
      const findFieldsByType = () => {
        const fieldsMap: Record<
          string,
          {
            booleanFields: string[];
            stringFields: string[];
            mediaFields: string[];
            componentFields: string[];
          }
        > = {};
        entities.forEach((entity) => {
          const fields = Object.keys(schema?.[entity]);
          fieldsMap[entity] = {
            booleanFields: [],
            stringFields: [],
            mediaFields: [],
            componentFields: [],
          };
          fields
            .filter((field) => !reserverdFields.includes(field))
            .forEach((field) => {
              const fieldType = schema?.[entity][field].type;
              switch (fieldType) {
                case StrapiTypes.String:
                case StrapiTypes.RichText:
                  fieldsMap[entity].stringFields.push(field);
                  break;
                case StrapiTypes.Boolean:
                  fieldsMap[entity].booleanFields.push(field);
                  break;
                case StrapiTypes.Media:
                  fieldsMap[entity].mediaFields.push(field);
                  break;
                case StrapiTypes.Component:
                  fieldsMap[entity].componentFields.push(field);
                  break;
                default:
                  break;
              }
            });
        });

        return fieldsMap;
      };

      const fieldsMap = findFieldsByType();
      for (const entity of entities) {
        const { stringFields, booleanFields, mediaFields, componentFields } =
          fieldsMap[entity];
        const dataPerEntity = parseArray(jsonData[entity]);

        for (const entityObject of dataPerEntity) {
          const strapiData = new FormData();
          const data: Record<string, unknown> = {};
          const parsedEntityObject = parseObject(entityObject);

          stringFields.forEach((stringField) => {
            const stringValue = parsedEntityObject[stringField];
            if (isString(stringValue)) data[stringField] = stringValue;
          });

          booleanFields.forEach((booleanField) => {
            const booleanValue = parsedEntityObject[booleanField];
            if (isBoolean(booleanValue))
              data[booleanField] = String(booleanValue);
          });

          componentFields.forEach((componentField) => {
            const componentValue = parsedEntityObject[componentField];
            const component = parseComponent(componentValue);
            if (!component) return;
            // component: {id: string, _id: string, facebook: string}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _id, id, ...restData } = component;
            // restData: {facebook: string}
            Object.entries(restData).forEach(([field, value]) => {
              data[field] = value;
            });
          });

          const mediaPromises = mediaFields.map(async (mediaField) => {
            const mediaValue = parsedEntityObject[mediaField];
            const media = parseFile(mediaValue);
            if (!media) return;
            const blob = await fetch(`${endpoint}${media.url}`).then((r) =>
              r.blob()
            );
            strapiData.append(`files.${mediaField}`, blob, media.name);
          });

          await Promise.all(mediaPromises);

          strapiData.append("data", JSON.stringify(data));
          await axios.post(`${migrationEndpoint}/api/${entity}`, strapiData);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

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
                <StaticStrapiSchema schema={entitySchema} />
              </div>

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
          ))}

          <div className="flex items-center gap-6 mt-4">
            <Text>Reserved Fields</Text>
            <Input
              value={reserverdFields.join(", ")}
              onChange={() => {}}
              disabled
            />
          </div>
        </>
      )}

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

      <Button className="mt-4" onClick={handleMapping} isLoading={isLoading}>
        Start Mapping
      </Button>
    </div>
  );
};
