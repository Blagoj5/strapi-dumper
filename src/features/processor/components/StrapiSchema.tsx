import clsx from "clsx";
import React from "react";
import { RemoveIcon } from "../../../../assets/RemoveIcon";
import { Text } from "../../../components/Typography";
import { reserverdFields } from "../consts/reservedFields";
import { Fields, StrapiType } from "../consts/types";

type Props = {
  fields: Fields;
  handleRequired: (args: { isChecked: boolean; fieldName: string }) => void;
  handleUnique: (args: { isChecked: boolean; fieldName: string }) => void;
  handleFieldRemove: (args: { fieldName: string }) => void;
  isChild?: boolean;
  onStrapiTypeChange: (
    fieldName: string,
    strapiType: StrapiType | undefined
  ) => void;
};

const findStapiType = (val: string) =>
  Object.values(StrapiType).find((strapiType) => strapiType === val);
export const StrapiSchema = ({
  fields,
  handleRequired,
  handleUnique,
  handleFieldRemove,
  isChild,
  onStrapiTypeChange,
}: Props) => {
  return (
    <div className="flex flex-col gap-2 pt-4">
      {fields
        .filter((field) => !reserverdFields.includes(field.name))
        .map((field) => (
          <div
            key={field.name}
            className={clsx({
              "bg-black bg-opacity-50 rounded-lg": isChild,
            })}
          >
            <div
              className={clsx("flex align-middle py-2", {
                "bg-gray-800 pointer-events-none":
                  field.type === StrapiType.Unknown,
              })}
            >
              <Text className="w-40 pl-2 flex items-center">{field.name}</Text>
              <select
                value={field.type}
                className="bg-transparent font-bold text-white opacity-70 rounded-2 py-2 px-2 focus-visible:outline-0"
                onChange={(e) =>
                  onStrapiTypeChange(
                    field.name,
                    findStapiType(e.currentTarget.value)
                  )
                }
              >
                {Object.values(StrapiType).map((strapiType) => (
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
                value={field.name}
                className="bg-black bg-opacity-30 w-40 font-bold text-white opacity-70 rounded-2 py-2 px-2 focus-visible:outline-0 ml-4 rounded-lg border border-transparent focus:border focus:border-gray-600"
                disabled
              />
              <div className="w-40 flex justify-center items-center">
                <input
                  type="checkbox"
                  onChange={(e) =>
                    handleRequired({
                      isChecked: e.currentTarget.checked,
                      fieldName: field.name,
                    })
                  }
                  checked={field.required}
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
                      fieldName: field.name,
                    })
                  }
                  checked={field.unique}
                  className="w-6 h-6"
                  id={`${field}-unique`}
                  name={`${field}-unique`}
                  value={`${field}-unique`}
                />
              </div>
              <RemoveIcon
                className="text-primary ml-4"
                onClick={() => handleFieldRemove({ fieldName: field.name })}
              />
            </div>
            {!!field.subFields && (
              <StrapiSchema
                fields={field.subFields}
                handleRequired={handleRequired}
                handleUnique={handleUnique}
                handleFieldRemove={handleFieldRemove}
                onStrapiTypeChange={onStrapiTypeChange}
                isChild
              />
            )}
          </div>
        ))}
    </div>
  );
};
