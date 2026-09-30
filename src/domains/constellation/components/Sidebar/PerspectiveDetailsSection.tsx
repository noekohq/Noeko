import { Text } from "@mantine/core";
import {
  ArrowLeftIcon,
  BuildingsIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import PaperButton from "@core/design/components/Paper/PaperButton";
import PaperInset from "@core/design/components/Paper/PaperInset";
import { BoundedList, SidebarSection, SidebarState } from "./SidebarAffordances";
import type { PerspectiveDetailsSectionProps } from "./types";
import styles from "./ConstellationSidebar.module.scss";

export function PerspectiveDetailsSection({
  perspective,
  name,
  detail,
  permissionLabel,
  relationships = [],
  relationshipLimit = 4,
  onShowAllRelationships,
  onReturnToMine,
  state,
}: PerspectiveDetailsSectionProps) {
  const IdentityIcon = perspective === "organization" ? BuildingsIcon : UserCircleIcon;

  return (
    <SidebarSection id="constellation-perspective" title="Perspective" icon={UsersThreeIcon}>
      <div className={styles.stack}>
        <div className={styles.identity}>
          <IdentityIcon aria-hidden size={24} weight="duotone" />
          <div>
            <Text size="sm" fw={650}>
              {name}
            </Text>
            {detail && (
              <Text size="xs" c="dimmed">
                {detail}
              </Text>
            )}
          </div>
        </div>

        {permissionLabel && (
          <PaperInset padding="xs">
            <Text size="xs" c="dimmed">
              Access · {permissionLabel}
            </Text>
          </PaperInset>
        )}

        <SidebarState state={state} />

        {relationships.length > 0 && (
          <BoundedList
            items={relationships}
            limit={relationshipLimit}
            getKey={(relationship) => relationship.id}
            onShowAll={onShowAllRelationships}
            showAllLabel="Show all relationship groups"
            renderItem={(relationship) => (
              <button
                type="button"
                className={styles.relationshipSummary}
                disabled={!relationship.onSelect}
                onClick={relationship.onSelect}
              >
                <span>{relationship.label}</span>
                <strong>{relationship.count}</strong>
              </button>
            )}
          />
        )}

        <PaperButton
          fullWidth
          size="xs"
          variant="light"
          disabled={!onReturnToMine}
          onClick={onReturnToMine}
          leftSection={<ArrowLeftIcon aria-hidden weight="bold" />}
        >
          Return to my graph
        </PaperButton>
      </div>
    </SidebarSection>
  );
}
