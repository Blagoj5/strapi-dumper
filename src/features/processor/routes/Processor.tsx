import axios from "axios";
import React, { useMemo, useState } from "react";
import JSONPretty from "react-json-pretty";
import { useImmer } from "use-immer";
import Tabs from "../../../components/Tabs";
import Button from "../../../components/Button";
import { Text } from "../../../components/Typography";
import { useLoadconfig } from "../../../hooks/useLoadConfig";
import { reserverdFields } from "../consts/reservedFields";
import {
  Field,
  isBoolean,
  isString,
  parseArray,
  parseComponent,
  parseFile,
  parseObject,
  Schema,
  StrapiType,
} from "../consts/types";
import { getAvailableKeys, getStrapiSchema } from "../utils";
import { EntityAnalyzer } from "../utils/EntityAnalyzer";
import { SchemaPane } from "../components/SchemaPane";

type Props = {
  jsonData: Record<string, unknown>;
};

export const Processor = ({ jsonData }: Props) => {
  const [schema, setSchema] = useImmer<Schema | undefined>(undefined);
  const [strapiMapData, setStrapiMapData] = useImmer<{
    [entity: string]: FormData[];
  }>({});
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

  const processedModels = useMemo(() => {
    if (!schema) return [];
    const formedSchemas = getStrapiSchema(schema);
    return formedSchemas;
  }, [schema]);

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
            const stringifiedData = formData.get("data");
            formData.delete("data");
            const data =
              typeof stringifiedData === "string"
                ? (JSON.parse(stringifiedData) as Record<string, unknown>)
                : undefined;

            if (data) {
              // remove subFields
              Object.keys(fieldInfo.subFields).forEach((subField) => {
                delete data[subField];
              });
              // set new preview JSOn data
              formData.set(
                "data",
                JSON.stringify({
                  ...data,
                  [field]: { id: "REPLACE WITH ACTUAL ID" },
                })
              );
            }

            return formData;
          });
        });
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

  const contentPanes = [
    {
      tab: "Schema",
      component: schema ? (
        <SchemaPane
          handleStrapiTypeChange={handleStrapiTypeChange}
          handleFieldRemove={handleFieldRemove}
          handleRequired={handleRequired}
          handleUnique={handleUnique}
          schema={schema}
        />
      ) : undefined,
    },
    {
      tab: "Strapi Schema",
      component: (
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
      ),
    },
    {
      tab: "JSON Preview",
      component: (
        <div>
          {strapiMultiData.map((data) => (
            <div key={data.entity}>
              <Text>{data.entity}</Text>
              <JSONPretty
                className="w-full overflow-scroll no-scrollbar max-h-[300px]"
                themeClassName="__json-pretty__ no-scrollbar"
                data={data.strapiData}
              />
            </div>
          ))}

          <Button
            className="mt-4"
            onClick={handleMapping}
            isLoading={isLoading}
          >
            Start Mapping
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mt-8">
      <Button onClick={handleProcess} disabled={disabled}>
        Process Schema
      </Button>
      <Tabs>
        <Tabs.Container>
          {contentPanes
            .map(({ tab }) => tab)
            .map((tab) => (
              <Tabs.Tab key={tab} id={tab.replace(" ", "-").toLowerCase()}>
                {tab}
              </Tabs.Tab>
            ))}
        </Tabs.Container>
        <Tabs.Content>
          {contentPanes.map((item) => (
            <Tabs.Item
              key={item.tab}
              id={item.tab.replace(" ", "-").toLowerCase()}
            >
              {item.component}
            </Tabs.Item>
          ))}
        </Tabs.Content>
      </Tabs>
    </div>
  );
};
