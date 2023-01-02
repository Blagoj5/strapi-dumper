import { useEffect, useMemo } from "react";
import { DropResult } from "react-beautiful-dnd";
import { useImmer } from "use-immer";
import {
  Field,
  Fields,
  parseArray,
  parseObject,
  Schema,
  StrapiType,
} from "../consts/types";
import { getAvailableKeys } from "../utils";
import { EntityAnalyzer } from "../utils/EntityAnalyzer";

const formSchema = (data: Record<string, unknown>) => {
  const formedSchema: Schema = {};

  const availableKeys = getAvailableKeys(data);

  availableKeys.forEach(({ fields, entity }) => {
    const entityAnalyzer = new EntityAnalyzer();
    const entityFields: Fields = [];
    const entityDataArr = parseArray(data[entity]);
    const entityData = entityDataArr.map(parseObject);
    fields.forEach((field) => {
      entityData.forEach((entityObject) => {
        const availableValue = entityObject[field];
        const fieldIndex = entityFields.findIndex(({ name }) => field === name);
        const fieldInfo = entityAnalyzer.analyzeField(
          field,
          entityFields[fieldIndex],
          availableValue
        );
        if (fieldIndex >= 0) entityFields[fieldIndex] = fieldInfo;
        else entityFields.push(fieldInfo);
      });
    });

    formedSchema[entity] = entityFields;
  });

  return formedSchema;
};

const reorder = <T>(list: T[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const defaultOptions: {
  buildOnFly: boolean;
  onBuild?: (newSchema: Schema) => void;
} = {
  buildOnFly: true,
};
export const useBuildSchema = (
  jsonData: Record<string, unknown>,
  options = defaultOptions
) => {
  const [schema, setSchema] = useImmer<Schema | undefined>(undefined);

  const buildSchema = () => {
    const formedSchema = formSchema(jsonData);
    setSchema(formedSchema);
    options.onBuild?.(formedSchema);
  };

  useEffect(() => {
    const builtSchema = options.buildOnFly ? formSchema(jsonData) : undefined;
    setSchema(builtSchema);
  }, [jsonData, options.buildOnFly]);

  const handleFieldRemove = (entity: string, fieldName: string) => {
    setSchema((stateSchema) => {
      if (stateSchema?.[entity]) {
        stateSchema[entity] = stateSchema[entity].filter(
          (field) => field.name !== fieldName
        );
      }
    });
  };

  const handleFieldFlagToggle = (
    {
      isChecked,
      entity,
      fieldName,
    }: {
      isChecked: boolean;
      entity: string;
      fieldName: string;
    },
    flagField: "unique" | "required"
  ) => {
    setSchema((stateSchema) => {
      if (stateSchema) {
        const fieldToModify = stateSchema[entity].find(
          (field) => field.name === fieldName
        );
        if (fieldToModify) {
          fieldToModify[flagField] = isChecked;
        }
      }
    });
  };

  const handleRequired = (args: {
    isChecked: boolean;
    entity: string;
    fieldName: string;
  }) => {
    handleFieldFlagToggle(args, "required");
  };

  const handleUnique = (args: {
    isChecked: boolean;
    entity: string;
    fieldName: string;
  }) => {
    handleFieldFlagToggle(args, "unique");
  };

  const handleStrapiTypeChange = (
    entity: string,
    fieldName: string,
    newStrapiType?: StrapiType,
    onTypeChange?: () => void
  ) => {
    switch (newStrapiType) {
      case StrapiType.RelationOneToOne: {
        const fieldInfo = schema?.[entity].find(
          (field) => field.name === fieldName
        );
        if (!fieldInfo) throw new Error("Field info doesn't exist");
        const newFieldInfo: Field = {
          name: fieldName,
          type: newStrapiType,
          subFields: [],
          required: false,
          unique: false,
        };
        setSchema((stateSchema) => {
          const fieldIndex = stateSchema?.[entity].findIndex(
            (field) => fieldName === field.name
          );
          if (stateSchema && fieldIndex && fieldIndex >= 0) {
            stateSchema[entity][fieldIndex] = newFieldInfo;
          }
        });

        onTypeChange?.();
        break;
      }

      default:
        break;
    }
  };

  const handleReorder = (result: DropResult, entity: string) => {
    if (!result.destination) {
      return;
    }

    if (result.destination.index === result.source.index) {
      return;
    }

    setSchema((stateSchema) => {
      const fields = stateSchema?.[entity];
      if (fields && result.destination) {
        const reorderFields = reorder(
          fields,
          result.source.index,
          result.destination.index
        );
        if (stateSchema) stateSchema[entity] = reorderFields;
      }
    });
  };

  console.log("**", schema);

  return {
    schema,
    buildSchema,
    handleFieldRemove,
    handleRequired,
    handleUnique,
    handleStrapiTypeChange,
    handleReorder,
  };
};
