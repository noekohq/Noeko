import React from "react";
import { Group, ScrollArea, Stack, Text, ActionIcon, Title } from "@mantine/core";
import { ArrowRightIcon } from "@phosphor-icons/react";
import styles from "./AcceleratorShelf.module.scss";
import { IAcceleratorItem, IShelfData } from "../../../../app/services/Recommendations";
import { Link, useNavigate } from "react-router";
import {
  getAcceleratorItemFields,
  IAcceleratorShelfUIDetails,
  resolveShelfRoute,
  resolveShelfToDetails,
} from "../../../utils/recommendations/accelerator";
import PaperThing from "../Paper/Things/PaperThing";
import { getThingPropsFromAcceleratorItem } from "../Paper/Things/thingUtils";
import GridCard from "../Paper/Things/GridCard";

export type IAcceleratorShelfLayout = "hero" | "carousel" | "list";

export interface IAcceleratorShelfProps {
  shelf: IShelfData;
  layout: IAcceleratorShelfLayout;
}

export function AcceleratorShelf({ shelf, layout }: IAcceleratorShelfProps) {
  const navigate = useNavigate();
  const details: IAcceleratorShelfUIDetails | undefined = resolveShelfToDetails[shelf.id];

  const { items } = shelf;
  const action = {
    label: "View All",
    onClick: () => details?.action(navigate),
  };

  const Component = () => {
    switch (layout) {
      case "hero":
        return <Hero details={details} items={items} numSideItems={2} />;
      case "carousel":
        return <Carousel details={details} items={items} />;
      case "list":
        return <List details={details} items={items} />;
      default:
        return null;
    }
  };

  if (!details) {
    return;
  }

  return (
    <div className={styles.shelf}>
      <Group justify="space-between" className={styles.header}>
        <Group gap="xs">
          <Text size="md" fw="bold" c="dark.3" className={styles.title}>
            {details.title}
          </Text>
        </Group>
        {action && (
          <ActionIcon variant="subtle" color="gray" onClick={action.onClick} size="sm">
            <ArrowRightIcon weight="bold" />
          </ActionIcon>
        )}
      </Group>
      <div className={styles.body}>{Component()}</div>
    </div>
  );
}

interface IHeroProps {
  items: IAcceleratorItem[];
  numSideItems: number;
  details: IAcceleratorShelfUIDetails | undefined;
}

function Hero({ items, numSideItems, details }: IHeroProps) {
  const heroDetails = details?.hero;
  const main = items?.[0];
  const sideItems = items.slice(1, 1 + numSideItems);

  const { name, reason, preview, detail, link } = getAcceleratorItemFields(main);

  const BannerIcon = heroDetails?.banner.icon;
  const bannerLabel = heroDetails?.banner.label;
  const bannerCta = heroDetails?.banner.cta;
  const CTAIcon = bannerCta?.icon;

  return (
    <div className={styles.hero}>
      <Link
        to={link}
        style={{
          textDecoration: "none",
        }}
      >
        <div className={styles.banner}>
          <Group justify="space-between">
            <div className={styles.label}>
              {BannerIcon ? <BannerIcon weight="bold" size={14} /> : null}
              {heroDetails?.banner.label}
            </div>
            <div className={styles.cta}>{CTAIcon ? <CTAIcon weight="bold" size={14} /> : null}</div>
          </Group>
          <div className={styles.content}>
            <Title order={2} fw="bold">
              {name}
            </Title>
            <Text size="sm" c="dimmed">
              {detail}
            </Text>
          </div>
        </div>
      </Link>
      <div className={styles.sideArea}>
        {sideItems.map((item) => {
          const props = getThingPropsFromAcceleratorItem(item);
          return (
            <div key={item.id.toString()} className={styles.sideItem}>
              <GridCard draggable={false} {...props} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ICarouselProps {
  items: IAcceleratorItem[];
  details: IAcceleratorShelfUIDetails;
}

function Carousel({ items, details }: ICarouselProps) {
  return (
    <ScrollArea type="never" scrollbars="x" className={styles.carouselScroll}>
      <div className={styles.carouselTrack}>
        {items.map((item, i) => {
          const props = getThingPropsFromAcceleratorItem(item);
          return (
            <div key={item.id.toString()} className={styles.item}>
              <GridCard {...props} draggable={false} />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

interface IListProps {
  items: IAcceleratorItem[];
  details: IAcceleratorShelfUIDetails;
}

function List({ items, details }: IListProps) {
  return (
    <Stack gap="xs">
      {items.map((item, i) => (
        <div key={i}>{item.context.label}</div>
      ))}
    </Stack>
  );
}

AcceleratorShelf.Hero = Hero;
AcceleratorShelf.Carousel = Carousel;
AcceleratorShelf.List = List;
export default AcceleratorShelf;
