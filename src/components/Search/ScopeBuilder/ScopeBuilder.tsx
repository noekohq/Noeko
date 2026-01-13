import React, { useEffect, useMemo, useState } from 'react';
import styles from './ScopeBuilder.module.scss';
import { IConnectableSearchQuery } from '../../../../app/services/Search';
import { MultiSelect, Select, Stack, Group, Text, SegmentedControl, ComboboxItem, Loader, Divider } from '@mantine/core';
import useFetch from '../../../hooks/useFetch';
import { ITag } from '../../../../app/database/models/tag';
import { IRabbithole } from '../../../../app/database/models/rabbithole';
import { useDebouncedValue } from '@mantine/hooks';
import { DatePickerInput } from '@mantine/dates';

export type IScope = Pick<IConnectableSearchQuery, 'tags' | 'rabbithole' | 'date'>;

export interface IScopeBuilderProps {
  value: IScope;
  onChange: (scope: IScope) => void;
}

const ScopeBuilder: React.FC<IScopeBuilderProps> = ({ value, onChange }) => {
  const [tagSearch, setTagSearch] = useState('');
  const [debouncedTagSearch] = useDebouncedValue(tagSearch, 300);
  
  const [rabbitholeSearch, setRabbitholeSearch] = useState('');
  const [debouncedRabbitholeSearch] = useDebouncedValue(rabbitholeSearch, 300);

  // Fetch tag suggestions
  const { data: tagSuggestions, load: loadTags, loading: loadingTags } = useFetch<undefined, ITag[]> ({
    url: '/search/tags/suggest',
    method: 'GET',
    query: { query: debouncedTagSearch || '', limit: '10' },
    dependencies: [debouncedTagSearch],
    runOnMount: true,
  });

  // Fetch rabbithole suggestions
  const { data: rabbitholeSuggestions, load: loadRabbitholes, loading: loadingRabbitholes } = useFetch<undefined, IRabbithole[]> ({
    url: '/search/rabbitholes/suggest',
    method: 'GET',
    query: { query: debouncedRabbitholeSearch || '', limit: '10' },
    dependencies: [debouncedRabbitholeSearch],
    runOnMount: true,
  });

  // Fetch full objects for currently selected IDs to ensure labels are visible
  const { data: selectedTagsData } = useFetch<undefined, ITag[]> ({
    url: '/tags',
    method: 'GET',
    runOnMount: true,
  });

  const { data: selectedRabbitholesData } = useFetch<undefined, IRabbithole[]> ({
    url: '/rabbithole',
    method: 'GET',
    runOnMount: true,
  });

  useEffect(() => {
    loadTags();
  }, [debouncedTagSearch]);

  useEffect(() => {
    loadRabbitholes();
  }, [debouncedRabbitholeSearch]);

  // Merge suggestions with selected items to ensure labels persist
  const tagOptions: ComboboxItem[] = useMemo(() => {
    const optionsMap = new Map<string, string>();
    
    // Add all user tags (since /tags is relatively small usually)
    (selectedTagsData || []).forEach(t => optionsMap.set(t.id.toString(), t.name));
    
    // Add search suggestions
    (tagSuggestions || []).forEach(t => optionsMap.set(t.id.toString(), t.name));
    
    return Array.from(optionsMap.entries()).map(([value, label]) => ({ value, label }));
  }, [tagSuggestions, selectedTagsData]);

  const rabbitholeOptions: ComboboxItem[] = useMemo(() => {
    const optionsMap = new Map<string, string>();
    
    // Add all user rabbitholes
    (selectedRabbitholesData || []).forEach(r => optionsMap.set(r.id.toString(), r.name));
    
    // Add search suggestions
    (rabbitholeSuggestions || []).forEach(r => optionsMap.set(r.id.toString(), r.name));
    
    return Array.from(optionsMap.entries()).map(([value, label]) => ({ value, label }));
  }, [rabbitholeSuggestions, selectedRabbitholesData]);


  const handleDateChange = (val: any) => {
    const [start, end] = val as [Date | null, Date | null];
    onChange({
      ...value,
      date: {
        updatedAt: {
          after: start?.toISOString(),
          before: end?.toISOString(),
        }
      }
    });
  };

  const dateValue: [Date | null, Date | null] = [
    value.date?.updatedAt?.after ? new Date(value.date.updatedAt.after) : null,
    value.date?.updatedAt?.before ? new Date(value.date.updatedAt.before) : null,
  ];

  return (
    <div className={styles.scopeBuilder}>
      <Stack gap="xs">
        <Text size="xs" fw="bold" c="dimmed">SCOPE FILTERS</Text>
        
        <Select
          label="Rabbithole"
          placeholder="Select or search..."
          data={rabbitholeOptions}
          value={value.rabbithole?.toString() || null}
          onChange={(v) => onChange({ ...value, rabbithole: v || undefined })}
          searchable
          onSearchChange={setRabbitholeSearch}
          searchValue={rabbitholeSearch}
          rightSection={loadingRabbitholes ? <Loader size={12} /> : null}
          clearable
          size="xs"
        />

        <Stack gap={4}>
          <Group justify="space-between" align="center">
            <Text size="xs" fw={500}>Tags</Text>
            <SegmentedControl
              size="xs"
              value={value.tags?.behavior || 'or'}
              onChange={(v) => onChange({
                ...value,
                tags: {
                  set: value.tags?.set || [],
                  behavior: v as 'and' | 'or'
                }
              })}
              data={[
                { label: 'ANY', value: 'or' },
                { label: 'ALL', value: 'and' },
              ]}
            />
          </Group>
          <MultiSelect
            placeholder="Select or search tags..."
            data={tagOptions}
            value={value.tags?.set.map(s => s.toString()) || []}
            onChange={(v) => onChange({
              ...value,
              tags: {
                set: v,
                behavior: value.tags?.behavior || 'or'
              }
            })}
            searchable
            onSearchChange={setTagSearch}
            searchValue={tagSearch}
            rightSection={loadingTags ? <Loader size={12} /> : null}
            size="xs"
          />
        </Stack>

        <Divider my="xs" label="Time Range" labelPosition="center" />

        <DatePickerInput
          type="range"
          label="Updated Between"
          placeholder="Pick date range"
          value={dateValue}
          onChange={handleDateChange}
          clearable
          size="xs"
        />
      </Stack>
    </div>
  );
};

export default ScopeBuilder;
