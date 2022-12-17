import clsx from "clsx";
import React from "react";

type Props = { children: string | string[]; className?: string };

export const Title = ({ children }: Props) => (
  <h1 className="text-gray-200 text-2xl mb-4">{children}</h1>
);

export const Subtitle = ({ children, className }: Props) => (
  <h2 className={clsx("text-gray-200 text-xl mb-4", className)}>{children}</h2>
);

export const Text = ({ children, className }: Props) => (
  <p className={clsx("text-gray-200 text-lg", className)}>{children}</p>
);
