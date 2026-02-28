import React from "react";
import styles from "./SemanticCloud.module.scss";

const SemanticWordCloud = () => {
  return (
    <div className={styles.cloudContainer}>
      {/* The Central Concept */}
      <div className={styles.cloudCenter}>SEMANTIC</div>

      {/* --- Tier 1: Large & Close --- */}
      <span className={`${styles.cloudWord} ${styles.wordLarge} ${styles.wordPos1}`}>Meaning</span>
      <span className={`${styles.cloudWord} ${styles.wordLarge} ${styles.wordPos2}`}>Context</span>
      <span className={`${styles.cloudWord} ${styles.wordLarge} ${styles.wordPos3}`}>Intent</span>

      {/* --- Tier 2: Medium --- */}
      <span className={`${styles.cloudWord} ${styles.wordMedium} ${styles.wordPos4}`}>
        Interpretation
      </span>
      <span className={`${styles.cloudWord} ${styles.wordMedium} ${styles.wordPos5}`}>NLU</span>
      <span className={`${styles.cloudWord} ${styles.wordMedium} ${styles.wordPos6}`}>
        Metadata
      </span>
      <span className={`${styles.cloudWord} ${styles.wordMedium} ${styles.wordPos7}`}>HTML</span>

      {/* --- Tier 3: Small & Far --- */}
      <span className={`${styles.cloudWord} ${styles.wordSmall} ${styles.wordPos8}`}>
        Connotation
      </span>
      <span className={`${styles.cloudWord} ${styles.wordSmall} ${styles.wordPos9}`}>Entity</span>
      <span className={`${styles.cloudWord} ${styles.wordSmall} ${styles.wordPos10}`}>
        Linked Data
      </span>
      <span className={`${styles.cloudWord} ${styles.wordSmall} ${styles.wordPos11}`}>
        Ontology
      </span>
      <span className={`${styles.cloudWord} ${styles.wordSmall} ${styles.wordPos12}`}>
        Pragmatics
      </span>
    </div>
  );
};

export default SemanticWordCloud;
