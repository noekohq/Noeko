import { Button, Group, Loader, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import PageWrapper from '@/components/Layout/PageWrapper';
import Content from '@core/design/components/Layout/Content';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import Scratchpad from '@/components/Display/Dashboard/Scratchpad';
import styles from "./Experimental.module.scss";
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import StatusBar from '@core/design/components/Layout/Bottom';
import WidgetWrapper from '@/components/Widgets/Wrapper';
import { ClockCounterClockwise, ClockCounterClockwiseIcon, PlusIcon } from "@phosphor-icons/react";
import StatusButton from '@/components/Display/Interactions/StatusButton';
import useFetch from '@/hooks/useFetch';
import { IDashboard } from '../../../app/services/Dashboard';
import { useEditor } from "@tiptap/react";
import { useEffect } from "react";
import CompoundButton from '@/components/Display/Interactions/CompoundButton';
import { useNavigate } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();
  const { isTablet, isDesktop } = useLayout();

  const {
    data: dashboardData,
    load: loadDashboard,
    loading: loadingDashboard,
  } = useFetch<undefined, IDashboard>({
    url: "/dashboard",
    onError: (err) => {
      console.error("Error getting dashboard data: ", err);
    },
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const mostRecent = () => {
    return dashboardData?.recentIdeas?.[0];
  };

  const navigate = useNavigate();

  return (
    <PageWrapper>
      <LeftSidebar startOpened={isTablet || isDesktop}>
        <LeftSidebar.Open>Test</LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <div className={styles.dashboard}>
          <Stack>
            <div className={styles.actionCenter}>
              <SimpleGrid cols={2} h={82} spacing={14}>
                <CompoundButton
                  auxilary={
                    loadingDashboard ? (
                      <Loader size="xs" color="gray" />
                    ) : (
                      <ClockCounterClockwiseIcon weight="regular" />
                    )
                  }
                  onClick={() => {
                    navigate(`/idea/${mostRecent()?.id.toString()}`);
                  }}
                >
                  <Text size="sm">{mostRecent()?.title || "Unknown"}</Text>
                </CompoundButton>
                <CompoundButton
                  auxilary={
                    loadingDashboard ? (
                      <Loader size="xs" color="gray" />
                    ) : (
                      <ClockCounterClockwiseIcon weight="regular" />
                    )
                  }
                  onClick={() => {
                    navigate(`/idea/${mostRecent()?.id.toString()}`);
                  }}
                >
                  <Text size="sm">{mostRecent()?.title || "Unknown"}</Text>
                </CompoundButton>
                <CompoundButton
                  auxilary={
                    loadingDashboard ? (
                      <Loader size="xs" color="gray" />
                    ) : (
                      <ClockCounterClockwiseIcon weight="regular" />
                    )
                  }
                  onClick={() => {
                    navigate(`/idea/${mostRecent()?.id.toString()}`);
                  }}
                >
                  <Text size="sm">{mostRecent()?.title || "Unknown"}</Text>
                </CompoundButton>
                <CompoundButton
                  auxilary={
                    loadingDashboard ? (
                      <Loader size="xs" color="gray" />
                    ) : (
                      <ClockCounterClockwiseIcon weight="regular" />
                    )
                  }
                  onClick={() => {
                    navigate(`/idea/${mostRecent()?.id.toString()}`);
                  }}
                >
                  <Text size="sm">{mostRecent()?.title || "Unknown"}</Text>
                </CompoundButton>
              </SimpleGrid>
            </div>
            <div className={styles.scratchpadWrapper}>
              <Scratchpad />
            </div>
          </Stack>
        </div>
      </Content>
      <RightSidebar startOpened={isDesktop}>
        <RightSidebar.Open>Test</RightSidebar.Open>
      </RightSidebar>
      <StatusBar />
    </PageWrapper>
  );
}
