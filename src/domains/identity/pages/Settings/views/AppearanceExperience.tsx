import { Stack, Text, Title, Select } from "@mantine/core";
import { useSettings } from "@/contexts/SettingsContext";
import { IThemeSpec } from "@/declarations/themes";
import { Link, useNavigate } from "react-router";
import PaperCard from "@core/design/components/Paper/PaperCard";
import PaperButton from "@core/design/components/Paper/PaperButton";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import { PaletteIcon, KeyReturnIcon } from "@phosphor-icons/react";
import classes from "../Settings.module.scss";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";

export default function AppearanceExperience() {
  const { i18n } = useLingui();
  const {
    ui: {
      language: { get: language, set: setLanguage },
      theme: {
        bodyFont: { get: bodyFont, set: setBodyFont },
        scheme: { get: scheme, set: setScheme },
        override: { get: override, set: setOverride },
      },
    },
  } = useSettings();
  const navigate = useNavigate();

  const themeData = [
    { label: i18n._(t`Default`), value: "noeko" as const, disabled: override === "noeko" },
    { label: i18n._(t`Nord`), value: "nord" as const, disabled: override === "nord" },
    { label: i18n._(t`Pink Lady`), value: "pinkLady" as const, disabled: override === "pinkLady" },
  ];

  const schemeData = [
    { label: i18n._(t`Dark`), value: "dark" as const },
    { label: i18n._(t`Light`), value: "light" as const },
    { label: i18n._(t`Auto`), value: "auto" as const },
  ];

  const fontData = [
    { label: i18n._(t`Sans-Serif`), value: "sans-serif" as const },
    { label: i18n._(t`Serif`), value: "serif" as const },
  ];

  const languageData = [
    { label: i18n._(t`English`), value: "en" },
    { label: i18n._(t`Español`), value: "es" },
    { label: i18n._(t`Français`), value: "fr" },
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
            data={themeData}
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
