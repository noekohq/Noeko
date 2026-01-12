import React from 'react';
import { IGlimpseResult } from '../../../../app/services/Spyglass';
import { IResultsMap } from '../../../hooks/useSpyglassService';

interface IGlimpseModeDisplayProps {
  glimpseResult: IGlimpseResult;
  resultsMap: IResultsMap;
}

const GlimpseModeDisplay: React.FC<IGlimpseModeDisplayProps> = ({ glimpseResult, resultsMap }) => {
  return (
    <div>
      <h2>Glimpse Mode</h2>
      <p>{glimpseResult.summary}</p>
      {glimpseResult.contentMap.map((set, setIndex) => (
        <div key={setIndex}>
          <h3>{set.title}</h3>
          <p>{set.description}</p>
          <ul>
            {set.results.map((result, resultIndex) => (
              <li key={resultIndex}>
                <h4>{result.title}</h4>
                <p>{result.explanation}</p>
                <p>ID: {result.resourceId}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default GlimpseModeDisplay;
