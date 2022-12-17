import clsx from "clsx";

/* eslint-disable react/react-in-jsx-scope */
type ButtonProps = {
  disabled?: boolean;
  onClick: () => void;
  children: string;
  className?: string;
};

const Button = ({ disabled, onClick, children, className }: ButtonProps) => {
  return (
    <button
      className={clsx(
        "ml-auto p-4 block bg-primary rounded-lg disabled:opacity-80 disabled:cursor-not-allowed",
        className
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
