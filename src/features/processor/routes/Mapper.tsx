import React from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { Subtitle } from "../../../components/Typography";
import { DraggableLists } from "../components/DraggableList";
import { useBuildSchema } from "../hooks";

const reorder = <T,>(list: T[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

type Props = {
  jsonData: Record<string, unknown>;
};
export const Mapper = ({ jsonData }: Props) => {
  const { schema, handleReorder } = useBuildSchema(jsonData);

  if (!schema) return null;

  return Object.entries(schema)?.map(([entity, fields]) => (
    <div key={entity}>
      <Subtitle className="capitalize">* {entity}</Subtitle>
      <DragDropContext onDragEnd={(result) => handleReorder(result, entity)}>
        <DraggableLists key={entity} droppableId="list" fields={fields} />
      </DragDropContext>
    </div>
  ));
};
