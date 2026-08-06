import { Box, Group, Stack, Text, Title, Select } from "@mantine/core";
import { useSettings } from "@/contexts/SettingsContext";
import { IThemeSpec } from "@/declarations/themes";
import { themeOptions } from "@core/design/themes/themes";
import { useNavigate } from "react-router";
import PaperCard from "@core/design/components/Paper/PaperCard";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import { GaugeIcon, PaletteIcon, KeyReturnIcon } from "@phosphor-icons/react";
import classes from "../Settings.module.scss";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { localeMap } from "@/i18n";
import { useConstellationVisualMode } from "@domains/constellation/components/Graph/useConstellationVisualMode";
import { isConstellationVisualMode } from "@domains/constellation/components/Graph/visualModes";

export default function AppearanceExperience() {
  const { i18n } = useLingui();
  const [constellationVisualMode, setConstellationVisualMode] = useConstellationVisualMode();
  const {
    ui: {
      language: { get: language, set: setLanguage },
      graphics: {
        mode: { get: graphicsMode, set: setGraphicsMode },
      },
      theme: {
        bodyFont: { get: bodyFont, set: setBodyFont },
        scheme: { get: scheme, set: setScheme },
        override: { get: override, set: setOverride },
      },
    },
  } = useSettings();
  const navigate = useNavigate();

  const schemeData = [
    { label: i18n._(t`Dark`), value: "dark" as const },
    { label: i18n._(t`Light`), value: "light" as const },
    { label: i18n._(t`Auto`), value: "auto" as const },
  ];

  const fontData = [
    { label: i18n._(t`Sans-Serif`), value: "sans-serif" as const },
    { label: i18n._(t`Serif`), value: "serif" as const },
  ];

  const languageData = localeMap();
  const graphicsData = [
    { label: i18n._(t`Full effects`), value: "full" as const },
    { label: i18n._(t`Reduced effects`), value: "reduced" as const },
  ];
  const constellationVisualModeData = [
    { label: i18n._(t`Depth (default)`), value: "depth" as const },
    { label: i18n._(t`Classic`), value: "classic" as const },
    { label: i18n._(t`Static`), value: "static" as const },
  ];

  const handleThemeChange = (v: IThemeSpec["override"] | null) => {
    if (v) {
      setOverride(v);
      const el = document.getElementById("theme");
      if (el) {
        el.classList.remove(classes.glint);
        void el.offsetWidth;
        el.classList.add(classes.glint);
      }
    }
  };

  const handleSchemeChange = (v: IThemeSpec["scheme"] | null) => {
    if (v) {
      setScheme(v);
      const el = document.getElementById("scheme");
      if (el) {
        el.classList.remove(classes.glint);
        void el.offsetWidth;
        el.classList.add(classes.glint);
      }
    }
  };

  const handleFontChange = (v: IThemeSpec["bodyFont"] | null) => {
    if (v) {
      setBodyFont(v);
      const el = document.getElementById("font");
      if (el) {
        el.classList.remove(classes.glint);
        void el.offsetWidth;
        el.classList.add(classes.glint);
      }
    }
  };

  const handleLanguageChange = (v: string | null) => {
    if (v) {
      setLanguage(v);
      const el = document.getElementById("language");
      if (el) {
        el.classList.remove(classes.glint);
        void el.offsetWidth;
        el.classList.add(classes.glint);
      }
    }
  };

  return (
    <Stack gap="lg" className={classes.fadeIn}>
      <Stack gap="xs">
        <Title order={2}>
          <Trans>Appearance & Experience</Trans>
        </Title>
        <Text c="dimmed">
          <Trans>Customize how Noeko looks and feels.</Trans>
        </Text>
      </Stack>

      <PaperCard title={i18n._(t`Theme & Styling`)} icon={PaletteIcon}>
        <Stack gap="md">
          <Select
            id="theme"
            label={i18n._(t`Theme`)}
            description={i18n._(t`Select a theme for the application.`)}
            value={override}
            data={themeOptions.map(({ label, value }) => ({ label, value }))}
            maxDropdownHeight={288}
            scrollAreaProps={{ type: "always", scrollbarSize: 6 }}
            styles={{ option: { height: 48 } }}
            renderOption={({ option }) => {
              const theme = themeOptions.find(({ value }) => value === option.value);

              return (
                <Group gap="sm" wrap="nowrap">
                  <Group gap={3} wrap="nowrap">
                    {theme?.swatches.map((color) => (
                      <Box
                        key={color}
                        w={10}
                        h={22}
                        style={{
                          backgroundColor: color,
                          borderRadius: "var(--mantine-radius-xs)",
                        }}
                      />
                    ))}
                  </Group>
                  <Box>
                    <Text size="sm" fw={600}>
                      {option.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {theme?.description}
                    </Text>
                  </Box>
                </Group>
              );
            }}
            onChange={(v) => handleThemeChange(v as IThemeSpec["override"])}
          />
          <Select
            id="scheme"
            label={i18n._(t`Color Scheme`)}
            description={i18n._(t`Choose between dark, light, or system default.`)}
            value={scheme}
            data={schemeData}
            onChange={(v) => handleSchemeChange(v as IThemeSpec["scheme"])}
          />
          <Select
            id="font"
            label={i18n._(t`Body Font`)}
            description={i18n._(t`Select the primary font for reading.`)}
            value={bodyFont}
            data={fontData}
            onChange={(v) => handleFontChange(v as IThemeSpec["bodyFont"])}
          />
          <Select
            id="language"
            label={i18n._(t`Language`)}
            description={i18n._(t`Select your preferred language.`)}
            value={language}
            data={languageData}
            onChange={handleLanguageChange}
          />
        </Stack>
      </PaperCard>

      <PaperCard title={i18n._(t`Graphics`)} icon={GaugeIcon}>
        <Stack gap="md">
          <Select
            id="graphics-mode"
            label={i18n._(t`Graphics quality`)}
            description={i18n._(
              t`Choose reduced effects on devices that struggle with intensive visualizations.`
            )}
            value={graphicsMode}
            data={graphicsData}
            onChange={(value) => {
              if (value === "full" || value === "reduced") setGraphicsMode(value);
            }}
          />
          <Select
            id="constellation-visual-mode"
            label={i18n._(t`Constellation visual mode`)}
            description={i18n._(
              t`Choose how Constellation emphasizes graph distance and interaction.`
            )}
            value={constellationVisualMode}
            data={constellationVisualModeData}
            onChange={(value) => {
              if (isConstellationVisualMode(value)) setConstellationVisualMode(value);
            }}
          />
        </Stack>
        <Text size="xs" c="dimmed" mt="xs">
          <Trans>These preferences are stored only on this device.</Trans>
        </Text>
      </PaperCard>

      <PaperCard title={i18n._(t`Interactions`)} icon={KeyReturnIcon}>
        <PaperThing
          id="keymap"
          title={i18n._(t`Keymap`)}
          detail={i18n._(t`View and customize keyboard shortcuts`)}
          icon={KeyReturnIcon}
          onClick={() => navigate("/keymap")}
        />
      </PaperCard>
    </Stack>
  );
}
