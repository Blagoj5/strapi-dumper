import React from "react";
import Button from "../../../components/Button";

type Props = {
  jsonData: Record<string, Record<string, unknown>>;
};

export const Processor = ({ jsonData }: Props) => {
  const disabled = Object.keys(jsonData).length === 0;
  const showProcessed = !disabled;
  return (
    <div>
      <Button
        onClick={() => console.log("process data")}
        disabled={disabled}
      >
        Generate And Process Schema
      </Button>
      {showProcessed && <h3>Schemas</h3>}
    </div>
  );
};
