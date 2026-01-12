import React from 'react';
import styles from './ScopeBuilder.module.scss';
import { IConnectableSearchQuery } from '../../../../app/services/Search';

export type IScope = Pick<IConnectableSearchQuery, 'tags' | 'rabbithole' | 'date'>;

export interface IScopeBuilderProps {
  value: IScope;
  onChange: (scope: IScope) => void;
}

const ScopeBuilder: React.FC<IScopeBuilderProps> = ({ value, onChange }) => {
  return (
    <div className={styles.scopeBuilder}>
      <h2>Scope Builder</h2>
      {/* TODO: Implement UI for selecting tags, rabbithole, and date ranges */}
    </div>
  );
};

export default ScopeBuilder;
