import { ActionIcon, Group, Highlight, Modal, Table, Text, TextInput } from "@mantine/core";
import { IConnectable } from "../../../../../../shared/types/constellation";
import styles from "./ConnectableTable.module.scss";
import {
  getNodeContent,
  getNodeDescription,
  getNodeLink,
  getNodeTitle,
  getTypeFromId,
  NodeIcon,
} from "@infrastructure/graph/utils";
import { ArrowRightIcon, ArrowsOutIcon, XIcon } from "@phosphor-icons/react";
import { Link } from "react-router";
import { useMemo, useState } from "react";

interface IConnectableTableProps {
  connectables: IConnectable[];
}

export default function ConnectableTable({ connectables }: IConnectableTableProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [previewing, setPreviewing] = useState<IConnectable>();

  const filteredThings = useMemo(() => {
    return connectables.filter((c) => {
      const title = getNodeTitle(c);
      const content = getNodeContent(c);
      const createdAt = c.createdAt.toString();
      const updatedAt = c.updatedAt.toString();
      return (
        title?.toLowerCase().includes(filterQuery) ||
        content?.toLowerCase().includes(filterQuery) ||
        createdAt?.toLowerCase().includes(filterQuery) ||
        updatedAt?.toLowerCase().includes(filterQuery)
      );
    });
  }, [filterQuery, connectables]);

  return (
    <div className={styles.connectableTable}>
      <div className={styles.filterbox}>
        <TextInput
          value={filterQuery}
          onChange={(e) => {
            if (e) {
              setFilterQuery(e.currentTarget.value);
            }
          }}
          placeholder="Filter things..."
          radius="md"
          size="sm"
          styles={{
            input: {
              border: "1px solid var(--mantine-color-dark-7)",
            },
          }}
          rightSection={
            filterQuery.length > 0 ? (
              <ActionIcon
                size="sm"
                variant="light"
                color="gray"
                onClick={() => {
                  setFilterQuery("");
                }}
              >
                <XIcon size={12} weight="bold" />
              </ActionIcon>
            ) : undefined
          }
        />
      </div>
      <table className={styles.table}>
        <thead>
          <th>Type</th>
          <th>Name</th>
          <th>Description</th>
          <th />
        </thead>
        <tbody>
          {filteredThings.map((connectable) => {
            const Icon = NodeIcon(connectable);

            return (
              <tr key={connectable.id.toString()}>
                <td>{Icon ? <Icon weight="bold" size={14} /> : undefined}</td>
                <td>
                  <Text size="sm">
                    <Highlight highlight={filterQuery}>
                      {getNodeTitle({
                        ...connectable,
                      }) ?? ""}
                    </Highlight>
                  </Text>
                </td>
                <td>
                  <Text size="sm">{getNodeDescription(connectable) ?? ""}</Text>
                </td>
                <td>
                  <Group>
                    <ActionIcon
                      variant="light"
                      color="gray"
                      size="md"
                      radius="md"
                      onClick={() => {
                        setPreviewing(connectable);
                      }}
                      styles={
                        filterQuery.length > 0
                          ? {
                              root: {
                                border: "1px solid var(--mantine-color-highlight-7)",
                              },
                            }
                          : {}
                      }
                    >
                      <ArrowsOutIcon />
                    </ActionIcon>
                    <Link to={getNodeLink(connectable) || ""}>
                      <ActionIcon variant="light" color="gray" size="md" radius="md">
                        <ArrowRightIcon />
                      </ActionIcon>
                    </Link>
                  </Group>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Modal
        opened={!!previewing}
        onClose={() => {
          setPreviewing(undefined);
        }}
        title={<Text size="sm">Previewing {previewing ? getNodeTitle(previewing) : ""}</Text>}
        onClick={(e) => {
          e.stopPropagation();
        }}
        size="lg"
      >
        <div
          dangerouslySetInnerHTML={{
            __html: previewing ? (getNodeContent(previewing) ?? "") : "",
          }}
        />
      </Modal>
    </div>
  );
}
