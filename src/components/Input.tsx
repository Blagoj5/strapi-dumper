export const Input = ({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  className?: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}) => {
  return (
    <input
      type="text"
      className={
        className ??
        "bg-black bg-opacity-30 w-40 font-bold text-white opacity-70 rounded-2 py-2 px-2 focus-visible:outline-0 ml-4 rounded-lg border border-transparent focus:border focus:border-gray-600"
      }
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      disabled={disabled}
    />
  );
};
