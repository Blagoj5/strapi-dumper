import { Input } from "../../../../components/Input";
import { Text } from "../../../../components/Typography";
import { reserverdFields } from "../../consts/reservedFields";
import { Schema, StrapiType } from "../../consts/types";
import { StaticStrapiSchema } from "../StaticStrapiSchema";
import { StrapiSchema } from "../StrapiSchema";

type Props = {
  schema: Schema;
  handleFieldRemove: (entity: string, field: string) => void;
  handleRequired: (args: {
    isChecked: boolean;
    entity: string;
    field: string;
  }) => void;
  handleUnique: (args: {
    isChecked: boolean;
    entity: string;
    field: string;
  }) => void;
  handleStrapiTypeChange: (
    entity: string,
    field: string,
    newStrapiType?: StrapiType
  ) => void;
};

export const SchemaPane = ({ schema, handleUnique, handleRequired, handleFieldRemove, handleStrapiTypeChange }: Props) => {
  return (
    <>
      {Object.entries(schema).map(([entity, entitySchema]) => (
        <div key={entity}>
          <Text className="uppercase text-white font-bold p-2">* {entity}</Text>
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
            handleFieldRemove={({ field }) => handleFieldRemove(entity, field)}
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
  );
};
