import { Accordion, List } from "@mantine/core";
import {
  ArticleIcon,
  AsteriskIcon,
  HighlighterIcon,
  NotepadIcon,
  ShapesIcon,
  Sparkle,
  TextAlignLeftIcon,
} from "@phosphor-icons/react";
import { IGenerativeSummary } from "../../../../app/database/models/ideas/summaries";

type IOverviewAccordionProps = {
  overview: Omit<IGenerativeSummary, "createdAt" | "id">;
};

export default function OverviewAccordion({
  overview,
}: IOverviewAccordionProps) {
  const {
    sentenceOverview,
    sentenceSummary,
    paragraphOverview,
    paragraphSummary,
    abstractSummary,
    simplifiedSummary,
    outline,
    keyPoints,
    highlights,
    questions,
    tasks,
  } = overview;

  return (
    <Accordion variant="filled">
      <Accordion.Item value={"overview"}>
        <Accordion.Control icon={<Sparkle />}>
          Sentence Overview
        </Accordion.Control>
        <Accordion.Panel>{sentenceOverview}</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="summary">
        <Accordion.Control icon={<Sparkle />}>Brief Summary</Accordion.Control>
        <Accordion.Panel>{sentenceSummary}</Accordion.Panel>
      </Accordion.Item>
      {paragraphSummary && (
        <Accordion.Item value="paragraph_summary">
          <Accordion.Control icon={<Sparkle />}>Summary</Accordion.Control>
          <Accordion.Panel>{paragraphSummary}</Accordion.Panel>
        </Accordion.Item>
      )}
      {paragraphOverview && (
        <Accordion.Item value="paragraph_overview">
          <Accordion.Control icon={<ArticleIcon />}>Overview</Accordion.Control>
          <Accordion.Panel>{paragraphOverview}</Accordion.Panel>
        </Accordion.Item>
      )}
      {abstractSummary && (
        <Accordion.Item value="abstract_summary">
          <Accordion.Control icon={<ShapesIcon />}>Abstract</Accordion.Control>
          <Accordion.Panel>{abstractSummary}</Accordion.Panel>
        </Accordion.Item>
      )}
      {simplifiedSummary && (
        <Accordion.Item value="simplified_summary">
          <Accordion.Control icon={<NotepadIcon />}>
            Simplified
          </Accordion.Control>
          <Accordion.Panel>{simplifiedSummary}</Accordion.Panel>
        </Accordion.Item>
      )}
      {outline && (
        <Accordion.Item value="outline">
          <Accordion.Control icon={<TextAlignLeftIcon />}>
            Outline
          </Accordion.Control>
          <Accordion.Panel>
            <List type="unordered">
              {outline.map((item, index) => (
                <List.Item key={index}>{item}</List.Item>
              ))}
            </List>
          </Accordion.Panel>
        </Accordion.Item>
      )}
      {keyPoints && (
        <Accordion.Item value="key_points">
          <Accordion.Control icon={<AsteriskIcon />}>
            Key Points
          </Accordion.Control>
          <Accordion.Panel>
            <List type="unordered">
              {keyPoints.map((item, index) => (
                <List.Item key={index}>{item}</List.Item>
              ))}
            </List>
          </Accordion.Panel>
        </Accordion.Item>
      )}
      {highlights && (
        <Accordion.Item value="highlights">
          <Accordion.Control icon={<HighlighterIcon />}>
            Highlights
          </Accordion.Control>
          <Accordion.Panel>
            <List type="unordered">
              {highlights.map((item, index) => (
                <List.Item key={index}>{item}</List.Item>
              ))}
            </List>
          </Accordion.Panel>
        </Accordion.Item>
      )}
      {questions && (
        <Accordion.Item value="questions">
          <Accordion.Control icon={<ArticleIcon />}>
            Questions
          </Accordion.Control>
          <Accordion.Panel>
            <List type="unordered">
              {questions.map((item, index) => (
                <List.Item key={index}>{item}</List.Item>
              ))}
            </List>
          </Accordion.Panel>
        </Accordion.Item>
      )}
      {tasks && (
        <Accordion.Item value="tasks">
          <Accordion.Control icon={<NotepadIcon />}>Tasks</Accordion.Control>
          <Accordion.Panel>
            <List type="unordered">
              {tasks.map((item, index) => (
                <List.Item key={index}>{item}</List.Item>
              ))}
            </List>
          </Accordion.Panel>
        </Accordion.Item>
      )}
    </Accordion>
  );
}
