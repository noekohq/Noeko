import React, { useState, useMemo } from "react";
import { Stack, Select, Button, Group } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import styles from "./PaperDateRangeFilter.module.scss";

// --- Types ---

interface IDateRange {
  field: 'createdAt' | 'updatedAt' | 'viewedAt';
  after?: string;  // ISO date string
  before?: string; // ISO date string
}

interface IDateRangeFilterProps {
  value: IDateRange | null;
  onChange: (value: IDateRange | null) => void;
  onClose?: () => void; // To close popover after selection
}

type Mode = 'presets' | 'custom';

// --- Presets Configuration ---

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 },
];

const FIELD_OPTIONS = [
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'createdAt', label: 'Date Created' },
  { value: 'viewedAt', label: 'Last Viewed' },
];

// --- Main Component ---

const PaperDateRangeFilter = ({ value, onChange, onClose }: IDateRangeFilterProps) => {
  const [mode, setMode] = useState<Mode>('presets');
  const [selectedField, setSelectedField] = useState<'createdAt' | 'updatedAt' | 'viewedAt'>(
    value?.field || 'updatedAt' // Always default to updatedAt
  );

  const handlePresetClick = (days: number) => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - days);
    
    onChange({
      field: selectedField,
      after: past.toISOString(),
      before: now.toISOString(),
    });
    
    onClose?.();
  };

  return (
    <div className={styles.wrapper}>
      {mode === 'presets' && (
        <PresetsView
          selectedField={selectedField}
          onFieldChange={setSelectedField}
          onPresetClick={handlePresetClick}
          onCustomClick={() => setMode('custom')}
        />
      )}
      {mode === 'custom' && (
        <CustomRangeView
          selectedField={selectedField}
          onFieldChange={setSelectedField}
          onApply={(after, before) => {
            onChange({
              field: selectedField,
              after,
              before,
            });
            onClose?.();
          }}
          onBack={() => setMode('presets')}
        />
      )}
    </div>
  );
};

// --- Sub-Components ---

interface PresetsViewProps {
  selectedField: 'createdAt' | 'updatedAt' | 'viewedAt';
  onFieldChange: (field: 'createdAt' | 'updatedAt' | 'viewedAt') => void;
  onPresetClick: (days: number) => void;
  onCustomClick: () => void;
}

const PresetsView = ({
  selectedField,
  onFieldChange,
  onPresetClick,
  onCustomClick,
}: PresetsViewProps) => (
  <Stack gap="xs">
    {/* Field Selector */}
    <Select
      label="Filter by"
      size="xs"
      value={selectedField}
      onChange={(val) => onFieldChange(val as any)}
      data={FIELD_OPTIONS}
    />
    
    {/* Preset Buttons */}
    <Stack gap="xs">
      {PRESETS.map(preset => (
        <Button
          key={preset.label}
          variant="light"
          size="sm"
          onClick={() => onPresetClick(preset.days)}
        >
          {preset.label}
        </Button>
      ))}
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={onCustomClick}
      >
        Custom Range...
      </Button>
    </Stack>
  </Stack>
);

interface CustomRangeViewProps {
  selectedField: 'createdAt' | 'updatedAt' | 'viewedAt';
  onFieldChange: (field: 'createdAt' | 'updatedAt' | 'viewedAt') => void;
  onApply: (after: string, before: string) => void;
  onBack: () => void;
}

const CustomRangeView = ({
  selectedField,
  onFieldChange,
  onApply,
  onBack,
}: CustomRangeViewProps) => {
  const [range, setRange] = useState<[Date | null, Date | null]>([null, null]);
  
  return (
    <Stack gap="md">
      {/* Back button */}
      <Button
        variant="subtle"
        size="xs"
        leftSection={<ArrowLeftIcon weight="bold" size={14} />}
        onClick={onBack}
      >
        Back
      </Button>
      
      {/* Field Selector */}
      <Select
        label="Filter by"
        size="xs"
        value={selectedField}
        onChange={(val) => onFieldChange(val as any)}
        data={FIELD_OPTIONS}
      />
      
      {/* Date Range Picker */}
      <DatePickerInput
        type="range"
        label="Date Range"
        placeholder="Pick dates range"
        value={range}
        onChange={(val) => setRange(val as [Date | null, Date | null])}
        maxDate={new Date()} // Prevent future dates
        size="xs"
      />
      
      {/* Apply Button */}
      <Button
        size="sm"
        onClick={() => {
          if (range[0] && range[1]) {
            onApply(range[0].toISOString(), range[1].toISOString());
          }
        }}
        disabled={!range[0] || !range[1]}
      >
        Apply Range
      </Button>
    </Stack>
  );
};

export default PaperDateRangeFilter;
