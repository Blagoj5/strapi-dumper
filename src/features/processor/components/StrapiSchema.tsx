import clsx from "clsx";
import React from "react";
import { RemoveIcon } from "../../../../assets/RemoveIcon";
import { Text } from "../../../components/Typography";
import { Schema, StrapiTypes } from "../consts/types";

type Props = {
  schema: Schema["string"];
  handleRequired: (args: { isChecked: boolean; field: string }) => void;
  handleUnique: (args: { isChecked: boolean; field: string }) => void;
  handleFieldRemove: (args: { field: string }) => void;
};

export const StrapiSchema = ({
  schema,
  handleRequired,
  handleUnique,
  handleFieldRemove,
}: Props) => {
  return (
    <>
      {Object.entries(schema).map(([field, fieldValue]) => (
        <div
          key={field}
          className={clsx("flex align-middle py-2", {
            "bg-gray-800 pointer-events-none":
              fieldValue.type === StrapiTypes.Unknown,
          })}
        >
          <Text className="w-40 pl-2 flex items-center">{field}</Text>
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
            onClick={() => handleFieldRemove({ field })}
          />

          { /* TODO: cleanup */ }
          {!!fieldValue.subFields && (
            <StrapiSchema
              schema={fieldValue.subFields}
              handleRequired={handleRequired}
              handleUnique={handleUnique}
              handleFieldRemove={handleFieldRemove}
            />
          )}
        </div>
      ))}
    </>
  );
};
