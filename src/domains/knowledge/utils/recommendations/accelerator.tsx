import {
  ArrowRightIcon,
  CheckIcon,
  FileIcon,
  FireSimpleIcon,
  IconProps,
  LightbulbIcon,
  SparkleIcon,
  TextAlignLeftIcon,
} from "@phosphor-icons/react";
import { IAcceleratorItem, IShelfData } from "../../../../../app/services/Recommendations";
import { getExcerptReferenceId } from "@domains/knowledge/utils/excerpts";
import { RabbitholeIcon } from "@core/design/icons/Icons";
import { formatDateTime } from "@core/utils/formatting";
import { Blockquote, Text } from "@mantine/core";
import { IAcceleratorShelfLayout } from "@domains/knowledge/components/Acceleration/AcceleratorShelf";
import { ca } from "zod/v4/locales";

export interface IAcceleratorItemFields {
  id: string;
  name: string;
  detail: string;
  preview: React.ReactNode;
  link: string;
  icon: React.FC<IconProps>;
  label: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export const acceleratorItemFieldResolvers: {
  [T in IAcceleratorItem["type"]]: {
    id: (item: Extract<IAcceleratorItem, { type: T }>) => string;
    name: (item: Extract<IAcceleratorItem, { type: T }>) => string;
    detail: (item: Extract<IAcceleratorItem, { type: T }>) => string;
    preview: (item: Extract<IAcceleratorItem, { type: T }>) => React.ReactNode;
    link: (item: Extract<IAcceleratorItem, { type: T }>) => string;
    icon: (item: Extract<IAcceleratorItem, { type: T }>) => React.FC<IconProps>;
  };
} = {
  activeRabbithole: {
    id: (item) => item.payload.id.toString(),
    name: (item) => item.payload.name,
    detail: (item) =>
      `Active ${item.payload.daysAgo > 0 ? `${item.payload.daysAgo} days ago` : "today"}`,
    link: (item) => `/rabbithole/${item.payload.id.toString()}`,
    icon: (_item) => RabbitholeIcon,
    preview: (item) => `Last active ${formatDateTime(item.payload.updatedAt)}` || "",
  },
  idea: {
    id: (item) => item.payload.id.toString(),
    name: (item) => item.payload.title,
    detail: (item) => item.context.reason || "",
    link: (item) => `/idea/${item.payload.id.toString()}`,
    icon: (_item) => LightbulbIcon,
    preview: (item) => item.payload.content,
  },
  task: {
    id: (item) => item.payload.id.toString(),
    name: (item) => item.payload.description,
    detail: (_item) => _item.context.reason,
    link: (item) => `/task/${item.payload.id.toString()}`,
    icon: (_item) => CheckIcon,
    preview: (item) => item.payload.scratchpad || "",
  },
  excerpt: {
    id: (item) => item.payload.id.toString(),
    name: (item) => item.payload.sourceText,
    detail: (item) => item.payload.note || "",
    link: (item) => `/source/${getExcerptReferenceId(item.payload)}`,
    icon: (_item) => TextAlignLeftIcon,
    preview: (item) => (
      <>
        <Blockquote p="xs" color="gray">
          <Text size="sm" fw="bold" c="dimmed">
            {item.payload.sourceText}
          </Text>
        </Blockquote>
        <Text size="sm" c="dimmed">
          {item.payload.note}
        </Text>
      </>
    ),
  },
  source: {
    id: (item) => item.payload.id.toString(),
    name: (item) => item.payload.displayName,
    detail: (item) => item.payload.analysis?.headline || "",
    link: (item) => `/source/${item.payload.id.toString()}`,
    icon: (_item) => FileIcon,
    preview: (item) => `Added ${formatDateTime(item.payload.createdAt)}` || "",
  },
  urgentTask: {
    id: (item) => item.payload.id.toString(),
    name: (item) => item.payload.description,
    detail: (item) =>
      item.payload.daysDiff < 0
        ? `Overdue by ${Math.abs(item.payload.daysDiff)} days`
        : `Due in ${item.payload.daysDiff} days`,
    link: (item) => `/task/${item.payload.id.toString()}`,
    icon: (_item) => CheckIcon,
    preview: (item) => `Created ${formatDateTime(item.payload.createdAt)}` || "",
  },
};

export const getAcceleratorItemFields = (item: IAcceleratorItem): IAcceleratorItemFields => {
  const resolver = acceleratorItemFieldResolvers[item.type];

  // A fallback for safety, though TS should prevent this.
  if (!resolver) {
    return {
      id: item.id,
      name: item.title,
      detail: "Unknown item type",
      preview: "",
      link: "/",
      icon: FileIcon,
      label: item.context.label,
      reason: item.context.reason,
      createdAt: item.payload.createdAt.toString(),
      updatedAt: item.payload.updatedAt.toString(),
    };
  }

  return {
    id: resolver.id(item as any),
    name: resolver.name(item as any),
    detail: resolver.detail(item as any),
    preview: resolver.preview(item as any),
    link: resolver.link(item as any),
    icon: resolver.icon(item as any),
    label: item.context.label,
    reason: item.context.reason,
    createdAt: item.payload.createdAt.toString(),
    updatedAt: item.payload.updatedAt.toString(),
  };
};

export const resolveShelfRoute: Record<IShelfData["id"], string> = {
  urgent: "/agenda",
  rabbitholes: "/rabbitholes",
  pins: "/pinned",
  rediscovery: "/constellation",
};

export type IAcceleratorShelfUIDetails = {
  title: string;
  action: (navigate: (route: string) => void) => void;
  hero: {
    banner: {
      icon: React.FC<IconProps>;
      label: string;
      cta: {
        icon: React.FC<IconProps>;
        label: string;
      };
    };
  };
  carousel: {};
  list: {};
};

export const resolveShelfToDetails: Record<IShelfData["id"], IAcceleratorShelfUIDetails> = {
  urgent: {
    title: "Urgent Tasks",
    action: (nav) => {
      nav("/agenda");
    },
    hero: {
      banner: {
        icon: FireSimpleIcon,
        label: "Do this first",
        cta: {
          icon: ArrowRightIcon,
          label: "Let's do this",
        },
      },
    },
    carousel: {},
    list: {},
  },
  pins: {
    title: "Your pins",
    action: (nav) => {
      nav("/pinned");
    },
    hero: {
      banner: {
        icon: SparkleIcon,
        label: "Most relevant",
        cta: {
          icon: ArrowRightIcon,
          label: "Go to pin",
        },
      },
    },
    carousel: {},
    list: {},
  },
  rabbitholes: {
    title: "Active Rabbitholes",
    action: (nav) => {
      nav("/rabbitholes");
    },
    hero: {
      banner: {
        icon: SparkleIcon,
        label: "Most relevant",
        cta: {
          icon: ArrowRightIcon,
          label: "Go to rabbithole",
        },
      },
    },
    carousel: {},
    list: {},
  },
  recent: {
    title: "Recent Activity",
    action: (nav) => {
      nav("/all");
    },
    hero: {
      banner: {
        icon: SparkleIcon,
        label: "Most recent",
        cta: {
          icon: ArrowRightIcon,
          label: "Go to item",
        },
      },
    },
    carousel: {},
    list: {},
  },
};
