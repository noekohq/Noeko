import React from "react";
// Make sure to import `Text`
import parse, { domToReact, HTMLReactParserOptions, Element, Text } from "html-react-parser";
import styles from "./AnimateHTMLStream.module.scss";

interface AnimatedHtmlContentProps {
  html: string;
}

const AnimateHTMLStream: React.FC<AnimatedHtmlContentProps> = ({ html }) => {
  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Text) {
        if (domNode.data.trim().length === 0) {
          return <>{domNode.data}</>;
        }

        const wordsAndSpaces = domNode.data.split(/(\s+)/);

        return (
          <>
            {wordsAndSpaces.map((chunk, index) =>
              chunk.trim().length > 0 ? (
                <span key={index} className={styles.word}>
                  {chunk}
                </span>
              ) : (
                <React.Fragment key={index}>{chunk}</React.Fragment>
              )
            )}
          </>
        );
      }
    },
  };

  return <div className={styles.overviewText}>{parse(html, options)}</div>;
};

export default React.memo(AnimateHTMLStream);
