export const Input = ({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}) => {
  return (
    <input
      type="text"
      className="bg-card-input rounded-sm px-4 py-2 border-2 border-gray-600 w-[300px]"
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      disabled={disabled}
    />
  );
};
