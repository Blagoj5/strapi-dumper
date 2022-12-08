/* eslint-disable react/react-in-jsx-scope */

import Button from "../../../components/Button";

type Props = {
  jsonData: Record<string, Record<string, unknown>>;
};
export const ProcessorPane = ({ jsonData }: Props) => {
  return (
    <div>
        <Button
          onClick={() => console.log("process data")}
          disabled={Object.keys(jsonData).length === 0}
        >
          Generate And Process Schema
        </Button>
      <h3>Schemas</h3>
    </div>
  );
};
