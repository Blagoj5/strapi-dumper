/* eslint-disable react/react-in-jsx-scope */
type ButtonProps = {
  disabled?: boolean;
  onClick: () => void;
  children: string;
};

const Button = ({ disabled, onClick, children }: ButtonProps) => {
  return (
    <button
      className="ml-auto p-4 block bg-primary rounded-lg disabled:opacity-80 disabled:cursor-not-allowed"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
