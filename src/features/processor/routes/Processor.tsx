import isHtml from "is-html";
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

export const Processor = ({ jsonData }: Props) => {
  const [schema, setSchema] =
    useState<Record<string, Record<string, StrapiTypes>>>();
  const [processedModels, setProcessedModels] = useState<ProcessedModel[]>([]);

  const disabled = Object.keys(jsonData).length === 0;
  const showProcessed = !disabled;

  const handleProcess = () => {
    const formedSchema:
      | Record<string, Record<string, StrapiTypes>>
      | undefined = {};
    Object.entries(jsonData).forEach(([entity, entityData]) => {
      const dataPerEntity = parseArray(entityData);
      if (!parseArray(dataPerEntity)) return;

      const keyToTypeMap: Record<string, StrapiTypes> = {};
      dataPerEntity.forEach((entityObject) => {
        const parsedEntityObject = parseObject(entityObject);

        const availableKeys = Object.keys(parsedEntityObject);

        availableKeys.forEach((availableKey) => {
          // e.g _id, name
          const availableValue = parsedEntityObject[availableKey];

          if (isDate(availableValue)) {
            keyToTypeMap[availableKey] = StrapiTypes.Date;
            return;
          }

          if (
            isString(availableValue) &&
            keyToTypeMap[availableKey] !== StrapiTypes.RichText
          ) {
            if (isHtml(availableValue))
              keyToTypeMap[availableKey] = StrapiTypes.RichText;
            else keyToTypeMap[availableKey] = StrapiTypes.String;
            return;
          }

          if (isFile(availableValue)) {
            keyToTypeMap[availableKey] = StrapiTypes.Media;
            return;
          }

          if (isComponent(availableValue)) {
            keyToTypeMap[availableKey] = StrapiTypes.Component;
            return;
          }
        });
      });

      console.log("***", keyToTypeMap);
      formedSchema[entity] = keyToTypeMap;
    });

    setSchema(formedSchema);
  };

  const handleFieldRemove = (field: string) => {
    const newSchema = { ...schema };
    delete newSchema[field];
    setSchema(newSchema);
  };

  const handleSchemaGeneration = () => {
    if (!schema) return;

    const formedSchemas: ProcessedModel[] = [];
    Object.entries(schema).forEach(([entity, entityField]) => {
      const formedSchema: Record<string, any> = {
        kind: "collectionType",
        collectionName: entity,
        info: {
          singularName: entity.slice(0, -1),
          displayName: entity.slice(0, -1),
          pluralName: entity,
        },
        options: {
          draftAndPublish: true,
        },
        pluginOptions: {},
      };

      const attributes: Record<string, any> = {};
      const components: Record<string, any>[] = [];

      Object.entries(entityField).forEach(([field, fieldType]) => {
        attributes[field] = {
          type: fieldType,
          required: false, // TODO: to be added
          unique: false, // TODO: to be added
        };

        if (fieldType === StrapiTypes.Component) {
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

        if (fieldType === StrapiTypes.Media) {
          attributes[field].multiple = false; // TODO: add this option
          attributes[field].allowedTypes = ["images"]; // TODO: handle this option
        }
      });

      formedSchema.attributes = attributes;

      formedSchemas.push({
        entityName: "athletes",
        fileName: "schema.json",
        url: getUrlToJson(formedSchema),
        hint: "ROOT_DIR/src/api/athlete/content-types/athlete/schema.json", //TODO: make dynamic
      });

      formedSchemas.push(
        ...components.map((component) => ({
          entityName: component.info.displayName,
          fileName: `${component.info.displayName}.json`,
          url: getUrlToJson(component),
          hint: "ROOT_DIR/src/components/socials/socials.json", //TODO: make dynamic
        }))
      );

    });

    setProcessedModels(formedSchemas);
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
                {Object.entries(entitySchema).map(([key, valType]) => (
                  <div key={key} className="flex align-middle">
                    <Text className="w-40">{key}</Text>
                    <select
                      value={valType}
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
                      value={key}
                      className="bg-black bg-opacity-30 w-40 font-bold text-white opacity-70 rounded-2 py-2 px-2 focus-visible:outline-0 ml-4 rounded-lg border border-transparent focus:border focus:border-gray-600"
                      disabled
                    />
                    <div className="w-40 flex justify-center items-center">
                      <input
                        type="checkbox"
                        disabled
                        className="w-6 h-6"
                        id={`${key}-required`}
                        name={`${key}-required`}
                        value={`${key}-required`}
                      />
                    </div>
                    <div className="w-40 flex justify-center items-center">
                      <input
                        type="checkbox"
                        disabled
                        className="w-6 h-6"
                        id={`${key}-unique`}
                        name={`${key}-unique`}
                        value={`${key}-unique`}
                      />
                    </div>
                    <RemoveIcon
                      className="text-primary ml-4"
                      onClick={() => handleFieldRemove(key)}
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
