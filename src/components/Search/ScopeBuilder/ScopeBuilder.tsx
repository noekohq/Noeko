import React, { useState } from "react";
import styles from "./ScopeBuilder.module.scss";
import { Group, Popover } from "@mantine/core";
import { ITag } from "../../../../shared/types/tags";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import { FunnelIcon, XIcon } from "@phosphor-icons/react";
import { Tabs } from "../../UI/Layout/Utils/Tabs";
import PaperDateRangeFilter from "../../Display/Paper/DateRangeFilter/PaperDateRangeFilter";
import { TagPickerContent } from "../../Display/Interactions/Tags/TagPicker";
import { RabbitholePickerContent } from "../../Display/Interactions/Rabbitholes/RabbitholePicker";
import { useLandscape } from "../../../contexts/LandscapeContext";
import { useSearch } from "../../../contexts/SearchContext";

export interface IScopeBuilderProps {}

const ScopeBuilder: React.FC<IScopeBuilderProps> = ({}) => {
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("tag");

  const {
    global: {
      scope: { get: value, set: onChange },
      scopeData: {
        tags: { add: addTag },
      },
    },
  } = useSearch();

  const {
    rabbitholes: {
      entered: { set: setRabbithole },
    },
  } = useLandscape();

  const handleAddTag = (tag: ITag) => {
    addTag(tag);
  };

  const handleSetRabbithole = (rh: IRabbithole) => {
    setRabbithole(rh);
    setPopoverOpened(false);
  };

  const handleDateChange = (
    val: { field: string; after?: string; before?: string } | null,
  ) => {
    if (!val) {
      onChange({ ...value, date: undefined });
      return;
    }

    if (!val.after || !val.before) {
      return;
    }

    onChange({
      ...value,
      date: {
        [val.field]: {
          after: val.after,
          before: val.before,
        },
      },
    });
    setPopoverOpened(false);
  };

  return (
    <Group className={styles.scopeBuilderContainer} gap="xs">
      <Popover
        position="bottom-start"
        withArrow
        opened={popoverOpened}
        onChange={setPopoverOpened}
        trapFocus
        shadow="md"
        width={360}
      >
        <Popover.Target>
          <div onClick={() => setPopoverOpened((o) => !o)}>
            <button className={styles.filterPill}>
              <span className={styles.icon}>
                {popoverOpened ? (
                  <XIcon weight="bold" size={12} />
                ) : (
                  <FunnelIcon weight="bold" size={12} />
                )}
              </span>
              <span className={styles.label}>Add Filter</span>
            </button>
          </div>
        </Popover.Target>
        <Popover.Dropdown className={styles.popoverContent} p="xs">
          <Tabs defaultValue="tag" onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="tag">Tags</Tabs.Tab>
              <Tabs.Tab value="rabbithole">Rabbitholes</Tabs.Tab>
              <Tabs.Tab value="date">Date</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="tag">
              <TagPickerContent
                onSelectExisting={handleAddTag}
                allowCreation={false}
                onClose={() => setPopoverOpened(false)}
                omitIds={value.tags?.set.map((id) => id.toString())}
              />
            </Tabs.Panel>

            <Tabs.Panel value="rabbithole">
              <RabbitholePickerContent
                onSelectExisting={handleSetRabbithole}
                allowCreation={false}
                onClose={() => setPopoverOpened(false)}
              />
            </Tabs.Panel>

            <Tabs.Panel value="date">
              <PaperDateRangeFilter
                value={
                  value.date
                    ? {
                        field: Object.keys(value.date)[0] as any,
                        ...value.date[
                          Object.keys(value.date)[0] as keyof typeof value.date
                        ],
                      }
                    : null
                }
                onChange={handleDateChange}
                onClose={() => setPopoverOpened(false)}
              />
            </Tabs.Panel>
          </Tabs>
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
};

export default ScopeBuilder;
