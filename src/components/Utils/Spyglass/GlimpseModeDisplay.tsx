import React from 'react';
import { IGlimpseResult } from '../../../../app/services/Spyglass';
import { IResultsMap } from '../../../hooks/useSpyglassService';
import { Stack, Text, Title, Card, Badge, Group, Button, Divider, Blockquote } from '@mantine/core';
import { ArrowRightIcon, SparkleIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { markdownToHtml } from '../../../utils/formatting';

interface IGlimpseModeDisplayProps {
  glimpseResult: IGlimpseResult;
  resultsMap: IResultsMap;
}

const GlimpseModeDisplay: React.FC<IGlimpseModeDisplayProps> = ({ glimpseResult, resultsMap }) => {
  return (
    <Stack gap="xl">
      <div>
        <Group mb="md">
          <SparkleIcon size={24} color="var(--mantine-color-blue-5)" weight="fill" />
          <Title order={3}>Glimpse</Title>
        </Group>
        <Text size="lg" style={{ lineHeight: 1.6 }}>{glimpseResult.summary}</Text>
      </div>

      <Divider />

      <Stack gap="lg">
        {glimpseResult.contentMap.map((set, setIndex) => (
          <div key={setIndex}>
            <Title order={5} mb="sm" c="dimmed">{set.title}</Title>
            <Stack gap="md">
              {set.results.map((result, resultIndex) => {
                const resource = resultsMap[result.resourceId];
                // Even if we don't have the resource in resultsMap (might happen if it wasn't in the initial search scope but referenced?), 
                // we should try to display what we have.
                // Ideally, result.resourceId should be in resultsMap.
                
                return (
                  <Card key={resultIndex} padding="md" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Text fw={600} size="sm">{result.title}</Text>
                      {resource && (
                        <Badge variant="light" color="gray" size="xs">
                          {resource.type}
                        </Badge>
                      )}
                    </Group>
                    <Text size="sm" c="dimmed" mb="md">
                      {result.explanation}
                    </Text>
                    
                    <Group justify="flex-end">
                      <Link 
                        to={resource ? `/${resource.type}/${resource.id.toString()}` : '#'}
                        style={{ textDecoration: 'none' }}
                      >
                        <Button 
                          variant="subtle" 
                          size="compact-xs" 
                          rightSection={<ArrowRightIcon size={12} />}
                          disabled={!resource}
                        >
                          View Resource
                        </Button>
                      </Link>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </div>
        ))}
      </Stack>
    </Stack>
  );
};

export default GlimpseModeDisplay;
