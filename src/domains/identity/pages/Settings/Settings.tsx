import { Container, Stack, Title, Autocomplete } from "@mantine/core";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import { useNavigate } from "react-router";
import {
  UserCircleIcon,
  PaletteIcon,
  DatabaseIcon,
  ActivityIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import React, { useEffect, useState, useRef, useMemo } from "react";
import classes from "./Settings.module.scss";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";

// Views
import AccountIdentity from "./views/AccountIdentity";
import AppearanceExperience from "./views/AppearanceExperience";
import WorkspaceData from "./views/WorkspaceData";
import ActivityNetworkCommunity from "./views/ActivityNetworkCommunity";
import Content from "@/core/design/components/Layout/Content";
import Search from "@/domains/discovery/components/Search/Search";
import { useLayout } from "@/contexts/LayoutContext";
import { themeOptions } from "@core/design/themes/themes";

export interface ISettingIndex {
  title: string;
  keywords: string[];
  route: string;
  elementId?: string;
  isExternalRoute?: boolean;
}

export default function Settings() {
  const { i18n } = useLingui();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>("account");

  const { isMobile } = useLayout();

  const NAV_ITEMS = useMemo(
    () => [
      {
        id: "account",
        title: i18n._(t`Account & Identity`),
        detail: i18n._(t`Manage profile & credentials`),
        icon: UserCircleIcon,
        link: "account",
      },
      {
        id: "appearance",
        title: i18n._(t`Appearance & Experience`),
        detail: i18n._(t`Theme, layout & keymap`),
        icon: PaletteIcon,
        link: "appearance",
      },
      {
        id: "data",
        title: i18n._(t`Workspace Data`),
        detail: i18n._(t`Import, export & tags`),
        icon: DatabaseIcon,
        link: "data",
      },
      {
        id: "activity",
        title: i18n._(t`Activity & Network`),
        detail: i18n._(t`History, sharing & community`),
        icon: ActivityIcon,
        link: "activity",
      },
    ],
    [i18n]
  );

  const SETTINGS_INDEX: ISettingIndex[] = useMemo(
    () => [
      {
        title: i18n._(t`Theme`),
        keywords: [
          i18n._(t`dark mode`),
          i18n._(t`light mode`),
          i18n._(t`color`),
          i18n._(t`appearance`),
          ...themeOptions.flatMap(({ label, keywords }) => [label, keywords]),
        ],
        route: "appearance",
        elementId: "theme",
      },
      {
        title: i18n._(t`Color Scheme`),
        keywords: [
          i18n._(t`dark`),
          i18n._(t`light`),
          i18n._(t`auto`),
          i18n._(t`system`),
          i18n._(t`scheme`),
        ],
        route: "appearance",
        elementId: "scheme",
      },
      {
        title: i18n._(t`Body Font`),
        keywords: [
          i18n._(t`font`),
          i18n._(t`text`),
          i18n._(t`serif`),
          i18n._(t`sans`),
          i18n._(t`typography`),
        ],
        route: "appearance",
        elementId: "font",
      },
      {
        title: i18n._(t`Language`),
        keywords: [
          i18n._(t`i18n`),
          i18n._(t`translation`),
          i18n._(t`english`),
          i18n._(t`spanish`),
          i18n._(t`french`),
          i18n._(t`locale`),
        ],
        route: "appearance",
        elementId: "language",
      },
      {
        title: i18n._(t`Graphics quality`),
        keywords: [
          i18n._(t`performance`),
          i18n._(t`graphics`),
          i18n._(t`effects`),
          i18n._(t`animation`),
          i18n._(t`reduced motion`),
          i18n._(t`GPU`),
        ],
        route: "appearance",
        elementId: "graphics-mode",
      },
      {
        title: i18n._(t`Constellation visual mode`),
        keywords: [
          i18n._(t`constellation`),
          i18n._(t`graph`),
          i18n._(t`depth`),
          i18n._(t`classic`),
          i18n._(t`static`),
          i18n._(t`animation`),
        ],
        route: "appearance",
        elementId: "constellation-visual-mode",
      },
      {
        title: i18n._(t`Keymap`),
        keywords: [
          i18n._(t`shortcuts`),
          i18n._(t`keyboard`),
          i18n._(t`hotkeys`),
          i18n._(t`interactions`),
        ],
        route: "/keymap",
        isExternalRoute: true,
      },
      {
        title: i18n._(t`Tags`),
        keywords: [i18n._(t`categories`), i18n._(t`organize`), i18n._(t`labels`)],
        route: "/tags",
        isExternalRoute: true,
      },
      {
        title: i18n._(t`Import Ideas`),
        keywords: [i18n._(t`upload`), i18n._(t`migrate`), i18n._(t`data in`), i18n._(t`markdown`)],
        route: "/import",
        isExternalRoute: true,
      },
      {
        title: i18n._(t`Export Stuff`),
        keywords: [i18n._(t`download`), i18n._(t`backup`), i18n._(t`data out`)],
        route: "/export",
        isExternalRoute: true,
      },
      {
        title: i18n._(t`Delete Workspace`),
        keywords: [
          i18n._(t`clear data`),
          i18n._(t`remove stuff`),
          i18n._(t`reset workspace`),
          i18n._(t`danger`),
        ],
        route: "data",
      },
      {
        title: i18n._(t`Edit Profile`),
        keywords: [i18n._(t`name`), i18n._(t`email`), i18n._(t`password`), i18n._(t`update user`)],
        route: "/settings/profile",
        isExternalRoute: true,
      },
      {
        title: i18n._(t`Logout`),
        keywords: [i18n._(t`sign out`), i18n._(t`leave`), i18n._(t`exit`)],
        route: "account",
      },
      {
        title: i18n._(t`Delete Account`),
        keywords: [i18n._(t`remove me`), i18n._(t`destroy`), i18n._(t`close account`)],
        route: "account",
      },
      {
        title: i18n._(t`Spyglass History`),
        keywords: [i18n._(t`past searches`), i18n._(t`activity log`), i18n._(t`recent`)],
        route: "/spyglass/history",
        isExternalRoute: true,
      },
      {
        title: i18n._(t`Shared Ideas`),
        keywords: [
          i18n._(t`collaboration`),
          i18n._(t`network`),
          i18n._(t`public`),
          i18n._(t`published`),
        ],
        route: "/ideas/shared",
        isExternalRoute: true,
      },
      {
        title: i18n._(t`Referral Link`),
        keywords: [i18n._(t`invite`), i18n._(t`friends`), i18n._(t`share noeko`), i18n._(t`promo`)],
        route: "activity",
      },
    ],
    [i18n]
  );

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  const handleSearchSelect = (value: string) => {
    const setting = SETTINGS_INDEX.find((s) => s.title === value);
    if (setting) {
      if (setting.isExternalRoute) {
        navigate(setting.route);
        return;
      }

      scrollToSection(setting.route);

      if (setting.elementId) {
        setTimeout(() => {
          const el = document.getElementById(setting.elementId || "");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.remove(classes.glint);
            void el.offsetWidth; // trigger reflow
            el.classList.add(classes.glint);
          }
        }, 300); // give it time to scroll to section first
      }
    }
  };

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar startOpened={!isMobile}>
        <LeftSidebar.Open>
          <Stack gap="md">
            <Title order={4} px="xs" mb="sm">
              <Trans>Settings</Trans>
            </Title>
            <Stack gap="xs">
              {NAV_ITEMS.map((item) => (
                <PaperThing
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  detail={item.detail}
                  icon={item.icon}
                  state={activeSection === item.link ? "suggested" : "default"}
                  preventClickDefault={true}
                  onClick={() => scrollToSection(item.link)}
                />
              ))}
            </Stack>
          </Stack>
        </LeftSidebar.Open>
      </LeftSidebar>

      <Content>
        <Container fluid p="md" pb={100} style={{ maxWidth: 800 }}>
          <Stack gap="xl">
            {/* Global Search */}
            <Autocomplete
              placeholder={i18n._(t`Search settings...`)}
              size="lg"
              leftSection={<MagnifyingGlassIcon />}
              radius="lg"
              data={SETTINGS_INDEX.map((s) => s.title)}
              onOptionSubmit={handleSearchSelect}
              maxDropdownHeight={300}
              styles={{
                input: {
                  backgroundColor: "var(--mantine-color-dark-8)",
                  border: "1px solid var(--mantine-color-dark-7)",
                },
              }}
              filter={({ options, search }) => {
                const searchLower = search.toLowerCase().trim();
                return options.filter((option) => {
                  if (typeof option === "string") {
                    const setting = SETTINGS_INDEX.find((s) => s.title === option);
                    if (!setting) return false;
                    return (
                      setting.title.toLowerCase().includes(searchLower) ||
                      setting.keywords.some((k) => k.toLowerCase().includes(searchLower))
                    );
                  }
                  if ("value" in option && typeof option.value === "string") {
                    const setting = SETTINGS_INDEX.find((s) => s.title === option.value);
                    if (!setting) return false;
                    return (
                      setting.title.toLowerCase().includes(searchLower) ||
                      setting.keywords.some((k) => k.toLowerCase().includes(searchLower))
                    );
                  }
                  return false;
                });
              }}
            />

            {/* Views stacked vertically */}
            <div
              id="account"
              ref={(el) => {
                sectionRefs.current["account"] = el;
              }}
            >
              <AccountIdentity />
            </div>

            <div
              id="appearance"
              ref={(el) => {
                sectionRefs.current["appearance"] = el;
              }}
              style={{ paddingTop: "2rem" }}
            >
              <AppearanceExperience />
            </div>

            <div
              id="data"
              ref={(el) => {
                sectionRefs.current["data"] = el;
              }}
              style={{ paddingTop: "2rem" }}
            >
              <WorkspaceData />
            </div>

            <div
              id="activity"
              ref={(el) => {
                sectionRefs.current["activity"] = el;
              }}
              style={{ paddingTop: "2rem" }}
            >
              <ActivityNetworkCommunity />
            </div>
          </Stack>
        </Container>
      </Content>

      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          <Search />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
