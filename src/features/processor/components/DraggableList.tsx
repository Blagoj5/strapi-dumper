import React from "react";
import { Draggable, Droppable } from "react-beautiful-dnd";
import { RemoveIcon } from "../../../../assets/RemoveIcon";
import { Fields } from "../consts/types";

type Props = {
  fields: Fields;
  droppableId: string;
};

const DraggableList = ({ fields, droppableId }: Props) => {
  return (
    <Droppable droppableId={droppableId}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          {Array.from(fields).map((field, index) => (
            <Draggable key={field.name} draggableId={field.name} index={index}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <div className="p-4 border-b border-b-gray-700 flex w-full">
                    <p className="w-60">{field.name}</p>
                    <p className="text-primary font-bold tracking-wide">
                      {field.type}
                    </p>
                    <RemoveIcon className="ml-auto text-primary" />
                  </div>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

const buildDroppableList = (fields: Fields, index: number): JSX.Element[] => {
  if (fields.length === 0) return [];

  const subFieldsDroppables = [
    <DraggableList
      key={`list-${index}`}
      droppableId={`list-${index}`}
      fields={fields}
    />,
  ];

  const childSubFieldsDroppables = fields
    .filter((field) => Boolean(field.subFields.length))
    .map((field, subIndex) =>
      buildDroppableList(field.subFields, Number(`${index}${subIndex}`))
    )
    .flat();

  return [...subFieldsDroppables, ...childSubFieldsDroppables];
};

export const DraggableLists = ({ fields, droppableId }: Props) => {
  const fieldEls = buildDroppableList(fields, 0);
  return <>{fieldEls}</>;
};
