import clsx from "clsx";
import React from "react";
import { Input } from "../../../components/Input";
import { Subtitle, Text } from "../../../components/Typography";
import { reserverdFields } from "../consts/reservedFields";
import { Schema, StrapiTypes } from "../consts/types";

type Props = {
  schema: Schema["string"];
};

export const StaticStrapiSchema = ({ schema }: Props) => {
  return (
    <div className="border-b border-gray-700 pb-4">
      <div className="flex items-center gap-6 mt-4">
        <Subtitle className="mb-0">Reserved Fields</Subtitle>
        <Text className="text-gray-500 text-sm">
          ( {reserverdFields.join(", ")} )
        </Text>
      </div>
      {Object.entries(schema)
        .filter(([field]) => reserverdFields.includes(field))
        .map(([field, fieldValue]) => (
          <div
            key={field}
            className={clsx("flex align-middle py-2", {
              "bg-gray-800 pointer-events-none":
                fieldValue.type === StrapiTypes.Unknown,
            })}
          >
            <Text className="w-40 pl-2 flex items-center">{field}</Text>
            <Input value={fieldValue.type} disabled onChange={() => {}} />
          </div>
        ))}
    </div>
  );
};
