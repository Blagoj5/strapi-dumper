import React from "react";

type Props = { children: string | string[]; className?: string };

export const Title = ({ children }: Props) => (
  <h1 className="text-gray-200 text-2xl mb-4">{children}</h1>
);

export const Subtitle = ({ children }: Props) => (
  <h2 className="text-gray-200 text-xl mb-4">{children}</h2>
);

export const Text = ({ children, className = "" }: Props) => (
  <p className={`text-gray-200 text-lg ${className}`}>{children}</p>
);
