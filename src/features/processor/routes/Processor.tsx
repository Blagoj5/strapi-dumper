import isHTML from "is-html";
import React, { useState } from "react";
import { z } from "zod";
import { RemoveIcon } from "../../../../assets/RemoveIcon";
import Button from "../../../components/Button";
import { Subtitle, Text } from "../../../components/Typography";
import { getUrlToJson } from "../../../utils/downloadObjectAsJson";

type Props = {
  jsonData: Record<string, unknown>;
};
const dateSchema = z.preprocess((arg) => {
  if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
}, z.date());
const parseObject = (val: unknown) =>
  z.record(z.string(), z.unknown()).parse(val);
const parseArray = (val: unknown) => z.array(z.unknown()).parse(val);
const isDate = (val: unknown): val is Date => dateSchema.safeParse(val).success;
const isString = (val: unknown): val is string => typeof val === "string";
const isComponent = (val: unknown) => {
  const res = z
    .object({
      id: z.string(),
    })
    .nullable()
    .safeParse(val);

  return res.success;
};
const isFile = (val: unknown) => {
  const fileSchema = z.object({
    name: z.string(),
    alternativeText: z.string(),
    caption: z.string(),
    hash: z.string(),
    ext: z.string(),
    mime: z.string(),
    size: z.number(),
    width: z.number(),
    height: z.number(),
    url: z.string(),
    formats: z.object({
      thumbnail: z.object({
        name: z.string(),
        hash: z.string(),
        ext: z.string(),
        mime: z.string(),
        width: z.number(),
        height: z.number(),
        size: z.number(),
        url: z.string(),
      }),
      medium: z.object({
        name: z.string(),
        hash: z.string(),
        ext: z.string(),
        mime: z.string(),
        width: z.number(),
        height: z.number(),
        size: z.number(),
        url: z.string(),
      }),
      small: z.object({
        name: z.string(),
        hash: z.string(),
        ext: z.string(),
        mime: z.string(),
        width: z.number(),
        height: z.number(),
        size: z.number(),
        url: z.string(),
      }),
    }),
    provider: z.string(),
    // related: ["5fb5b2c74ed9430012005246"], TODO: what is this for?
    createdAt: dateSchema,
    updatedAt: dateSchema,
    __v: z.number(),
    id: z.string(),
  });

  return fileSchema.safeParse(val).success;
};

type ProcessedModel = {
  entityName: string;
  fileName: string;
  url: string;
  hint: string;
};

enum StrapiTypes {
  RichText = "richtext",
  String = "string",
  Date = "date",
  Component = "component",
  Relation = "relation",
  Media = "media",
}

type Schema = {
  [entity: string]: {
    [field: string]: {
      type: StrapiTypes;
      required: boolean;
      unique: boolean;
    };
  };
};
export const Processor = ({ jsonData }: Props) => {
  const [schema, setSchema] = useState<Schema>();
  const [processedModels, setProcessedModels] = useState<ProcessedModel[]>([]);

  const disabled = Object.keys(jsonData).length === 0;
  const showProcessed = !disabled;

  const handleProcess = () => {
    const formedSchema: Schema = {};

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

          if (isDate(availableValue)) {
            keyToTypeMap[field] = {
              type: StrapiTypes.Date,
              required: isRequired,
              unique: false,
            };
            return;
          }

          if (
            isString(availableValue) &&
            keyToTypeMap[field]?.type !== StrapiTypes.RichText
          ) {
            if (uniqueValues.includes(availableValue)) isUniqueString = false;
            keyToTypeMap[field] = {
              type: isHTML(availableValue)
                ? StrapiTypes.RichText
                : StrapiTypes.String,
              required: isRequired,
              unique: isUniqueString,
            };
            uniqueValues.push(availableValue);
            return;
          }

          if (isFile(availableValue)) {
            keyToTypeMap[field] = {
              type: StrapiTypes.Media,
              required: isRequired,
              unique: false,
            };
            return;
          }

          if (isComponent(availableValue)) {
            keyToTypeMap[field] = {
              type: StrapiTypes.Component,
              required: isRequired,
              unique: false,
            };
            return;
          }
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

      Object.entries(entityField).forEach(([field, fieldValue]) => {
        attributes[field] = fieldValue;

        if (fieldValue.type === StrapiTypes.Component) {
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
                {Object.entries(entitySchema).map(([field, fieldValue]) => (
                  <div key={field} className="flex align-middle">
                    <Text className="w-40">{field}</Text>
                    <select
                      value={fieldValue.type}
                      className="bg-transparent font-bold text-white opacity-70 rounded-2 py-2 px-2 focus-visible:outline-0"
                    >
                      {Object.values(StrapiTypes).map((strapiType) => (
                        <option
                          key={strapiType}
                          className="bg-bg-primary"
                          id={strapiType}
                          value={strapiType}
                        >
                          {strapiType}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={field}
                      className="bg-black bg-opacity-30 w-40 font-bold text-white opacity-70 rounded-2 py-2 px-2 focus-visible:outline-0 ml-4 rounded-lg border border-transparent focus:border focus:border-gray-600"
                      disabled
                    />
                    <div className="w-40 flex justify-center items-center">
                      <input
                        type="checkbox"
                        onChange={(e) =>
                          handleRequired({
                            isChecked: e.currentTarget.checked,
                            entity,
                            field,
                          })
                        }
                        checked={fieldValue.required}
                        className="w-6 h-6"
                        id={`${field}-required`}
                        name={`${field}-required`}
                        value={`${field}-required`}
                      />
                    </div>
                    <div className="w-40 flex justify-center items-center">
                      <input
                        type="checkbox"
                        onClick={(e) =>
                          handleUnique({
                            isChecked: e.currentTarget.checked,
                            entity,
                            field,
                          })
                        }
                        checked={fieldValue.unique}
                        className="w-6 h-6"
                        id={`${field}-unique`}
                        name={`${field}-unique`}
                        value={`${field}-unique`}
                      />
                    </div>
                    <RemoveIcon
                      className="text-primary ml-4"
                      onClick={() => handleFieldRemove(entity, field)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <Button onClick={handleSchemaGeneration}>Generate models schema</Button>

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
    </div>
  );
};
