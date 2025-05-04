import React, { ReactNode, ReactElement } from "react";

const escapeRegex = (str: string): string => {
  // $& means the whole matched string
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

interface IMatchProps {
  opener: string;
  closer: string;
  match: (text: string) => ReactElement;
  children: ReactNode;
}

export const Match: React.FC<IMatchProps> = ({
  children,
  opener,
  closer,
  match,
}) => {
  if (typeof children !== "string") {
    console.warn("Replace component expects a string child to process.");
    return <>{children}</>;
  }

  if (!opener || !closer) {
    console.warn(
      "Replace component requires non-empty opener and closer props.",
    );
    return <>{children}</>;
  }

  const escapedOpener = escapeRegex(opener);
  const escapedCloser = escapeRegex(closer);

  const regex = new RegExp(`(${escapedOpener}.*?${escapedCloser})`, "g");
  const parts = children.split(regex).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith(opener) && part.endsWith(closer)) {
          const content = part.slice(opener.length, -closer.length);
          const element = match(content);
          return React.cloneElement(element, { key: `match-${index}` });
        } else {
          return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
        }
      })}
    </>
  );
};
