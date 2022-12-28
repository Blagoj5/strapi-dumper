import axios from "axios";
import React, { useMemo, useState } from "react";
import JSONPretty from "react-json-pretty";
import { useImmer } from "use-immer";
import Button from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Subtitle, Text } from "../../../components/Typography";
import { useLoadconfig } from "../../../hooks/useLoadConfig";
import { getUrlToJson } from "../../../utils/downloadObjectAsJson";
import { StaticStrapiSchema } from "../components/StaticStrapiSchema";
import { StrapiSchema } from "../components/StrapiSchema";
import { reserverdFields } from "../consts/reservedFields";
import {
  Field,
  isBoolean,
  isString,
  parseArray,
  parseComponent,
  parseFile,
  parseObject,
  ProcessedModel,
  Schema,
  StrapiType,
} from "../consts/types";
import { getAvailableKeys } from "../utils";
import { EntityAnalyzer } from "../utils/EntityAnalyzer";

type Props = {
  jsonData: Record<string, unknown>;
};

export const Processor = ({ jsonData }: Props) => {
  const [schema, setSchema] = useImmer<Schema | undefined>(undefined);
  const [strapiMapData, setStrapiMapData] = useImmer<{
    [entity: string]: FormData[];
  }>({});
  const [processedModels, setProcessedModels] = useState<ProcessedModel[]>([]);
  const { migrationEndpoint, endpoint } = useLoadconfig();

  const [isLoading, setIsLoading] = useState(false);

  const disabled = Object.keys(jsonData).length === 0;
  const showProcessed = !disabled;

  const handleProcess = async () => {
    const formedSchema: Schema = {};

    const availableKeys = getAvailableKeys(jsonData);

    availableKeys.forEach(({ fields, entity }) => {
      const entityAnalyzer = new EntityAnalyzer();
      const keyToTypeMap: Schema[string] = {};
      const entityDataArr = parseArray(jsonData[entity]);
      const entityData = entityDataArr.map(parseObject);
      fields.forEach((field) => {
        entityData.forEach((entityObject) => {
          const availableValue = entityObject[field];
          const fieldInfo = entityAnalyzer.analyzeField(
            field,
            keyToTypeMap[field],
            availableValue
          );
          keyToTypeMap[field] = fieldInfo;
        });
      });

      formedSchema[entity] = keyToTypeMap;
    });

    setSchema(formedSchema);

    if (!formedSchema) return;

    // TODO: rework
    // logic for showing json preview of the previsouly proccessed schema
    const entities = Object.keys(formedSchema);
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
        const fields = Object.keys(formedSchema?.[entity]);
        fieldsMap[entity] = {
          booleanFields: [],
          stringFields: [],
          mediaFields: [],
          componentFields: [],
        };
        fields
          .filter((field) => !reserverdFields.includes(field))
          .forEach((field) => {
            const fieldType = formedSchema?.[entity][field].type;
            switch (fieldType) {
              case StrapiType.String:
              case StrapiType.RichText:
                fieldsMap[entity].stringFields.push(field);
                break;
              case StrapiType.Boolean:
                fieldsMap[entity].booleanFields.push(field);
                break;
              case StrapiType.Media:
                fieldsMap[entity].mediaFields.push(field);
                break;
              case StrapiType.Component:
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
          const file = await fetch(`${endpoint}${media.url}`);
          const blob = await file.blob();
          strapiData.append(`files.${mediaField}`, blob, media.name);
        });

        await Promise.all(mediaPromises);

        strapiData.append("data", JSON.stringify(data));
        setStrapiMapData((strapiMap) => {
          if (strapiMap[entity]) strapiMap[entity].push(strapiData);
          else strapiMap[entity] = [strapiData];
        });
      }
    }
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
            ![StrapiType.Unknown, StrapiType.Nullish].includes(
              fieldValue.type
            ) && !reserverdFields.includes(field)
        )
        .forEach(([field, fieldValue]) => {
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
    setSchema((stateSchema) => {
      if (stateSchema) stateSchema[entity][field][flagField] = isChecked;
    });
  };

  const handleRequired = (args: {
    isChecked: boolean;
    entity: string;
    field: string;
  }) => {
    handleFieldFlagToggle(args, "required");
  };

  const handleStrapiTypeChange = (
    entity: string,
    field: string,
    newStrapiType?: StrapiType
  ) => {
    switch (newStrapiType) {
      case StrapiType.RelationOneToOne: {
        const fieldInfo = schema?.[entity]?.[field];
        if (!fieldInfo) throw new Error("Field info doesn't exist");
        const newFieldInfo: Field = {
          type: newStrapiType,
          subFields: {},
          required: false,
          unique: false,
        };
        setSchema((stateSchema) => {
          if (stateSchema) stateSchema[entity][field] = newFieldInfo;
        });

        setStrapiMapData((strapiMap) => {
          strapiMap[entity] = strapiMap[entity].map((formData) => {
            formData.set(field, JSON.stringify({ id: "REPLACE WITH ACTUAL ID" }));
            return formData;
          });
        });

        // I need to use this to update JSON previewer
        // setStrapiMapData((prevState) => ({
        break;
      }

      default:
        break;
    }
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
      const entitiesData = Object.entries(strapiMapData);
      for (const [entity, strapiData] of entitiesData) {
        for (const data of strapiData) {
          await axios.post(`${migrationEndpoint}/api/${entity}`, data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const strapiMultiData = useMemo(() => {
    const strapiDataEntities: {
      strapiData: Record<string, any>;
      entity: string;
    }[] = [];
    const entities = Object.keys(strapiMapData);
    entities.forEach((entity) => {
      const newStrapiMap: Record<string, any>[] = strapiMapData[entity].map(
        (strapiData) => {
          const object: Record<string, any> = {};
          strapiData.forEach(function (value, key) {
            try {
              object[key] = JSON.parse(value.toString());
            } catch (error) {
              object[key] = value.toString();
            }
          });
          return object;
        }
      );
      strapiDataEntities.push({ entity, strapiData: newStrapiMap });
    });
    return strapiDataEntities;
  }, [strapiMapData]);
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
                onStrapiTypeChange={(...args) =>
                  handleStrapiTypeChange(entity, ...args)
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

      {strapiMultiData.map((data) => (
        <>
          <Text>{data.entity}</Text>
          <JSONPretty
            className="w-full overflow-scroll no-scrollbar max-h-[300px]"
            themeClassName="__json-pretty__ no-scrollbar"
            data={data.strapiData}
          />
        </>
      ))}

      <Button className="mt-4" onClick={handleMapping} isLoading={isLoading}>
        Start Mapping
      </Button>
    </div>
  );
};
