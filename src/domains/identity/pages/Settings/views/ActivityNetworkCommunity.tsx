import { Stack, Text, Title, CopyButton } from "@mantine/core";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { useNavigate } from "react-router";
import PaperCard from "@core/design/components/Paper/PaperCard";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import React, { useState } from "react";
import {
  ActivityIcon,
  ListMagnifyingGlassIcon,
  LightbulbIcon,
  UsersIcon,
  DiscordLogoIcon,
  RedditLogoIcon,
  LinkIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import classes from "../Settings.module.scss";
import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";

export default function ActivityNetworkCommunity() {
  const { i18n } = useLingui();
  const { referralLink } = useAuth();
  const navigate = useNavigate();

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = (copyFn: () => void) => {
    copyFn();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Stack gap="lg" className={classes.fadeIn}>
      <Stack gap="xs">
        <Title order={2}>
          <Trans>Activity & Network</Trans>
        </Title>
        <Text c="dimmed">
          <Trans>View your history and connect with the community.</Trans>
        </Text>
      </Stack>

      <PaperCard title={i18n._(t`Your Activity`)} icon={ActivityIcon}>
        <PaperThing
          id="history"
          title={i18n._(t`Spyglass History`)}
          detail={i18n._(t`Review your search and exploration history`)}
          icon={ListMagnifyingGlassIcon}
          onClick={() => navigate("/spyglass/history")}
        />
        <PaperThing
          id="shared"
          title={i18n._(t`Shared Ideas`)}
          detail={i18n._(t`Manage ideas you've shared with others`)}
          icon={LightbulbIcon}
          onClick={() => navigate("/ideas/shared")}
        />
      </PaperCard>

      <PaperCard title={i18n._(t`Community & Sharing`)} icon={UsersIcon}>
        {referralLink && (
          <CopyButton value={referralLink}>
            {({ copy }) => (
              <PaperThing
                id="referral"
                title={i18n._(t`Copy Referral Link`)}
                detail={i18n._(t`Share Noeko with friends`)}
                icon={copiedLink ? CheckIcon : LinkIcon}
                onClick={() => handleCopyLink(copy)}
                preventClickDefault
              />
            )}
          </CopyButton>
        )}
        <PaperThing
          id="discord"
          title={i18n._(t`Join the Discord`)}
          detail={i18n._(t`Chat with developers and other users`)}
          icon={DiscordLogoIcon}
          onClick={() => window.open("https://discord.gg/TY9sna9ZbT", "_blank")}
          preventClickDefault
        />
        <PaperThing
          id="reddit"
          title={i18n._(t`Check out the Subreddit`)}
          detail={i18n._(t`Join discussions on Reddit`)}
          icon={RedditLogoIcon}
          onClick={() => window.open("https://reddit.com/r/noeko", "_blank")}
          preventClickDefault
        />
      </PaperCard>
    </Stack>
  );
}
