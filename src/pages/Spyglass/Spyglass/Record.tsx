import PageWrapper from "../../../components/Layout/PageWrapper";
import LeftSidebar from "../../../components/UI/Layout/Left";
import RightSidebar from "../../../components/UI/Layout/Right";
import { ActionIcon, Grid, Group, Stack, Text } from "@mantine/core";
import { useSpyglassRecord } from "../hooks/useSpyglass";

import styles from "./Record.module.scss";
import { DisplayOverview } from "../../../components/Utils/Spyglass/Overview";
import Content from "../../../components/UI/Layout/Content";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useLayout } from "../../../contexts/LayoutContext";
import {
  CaretLeftIcon,
  ClockCounterClockwiseIcon,
} from "@phosphor-icons/react";
import SpyglassContext from "./SpyglassContext";
import SpyglassActions from "./SpyglassActions";
import Nav from "../../../components/UI/Layout/Nav";
import { Link, useParams } from "react-router";

// export default function SpyglassRecord() {
//   const { spyglassId } = useParams<{ spyglassId: string }>();

//   const { spyglass, resultMap, citationMap, loading, fullResults } =
//     useSpyglassRecord({
//       spyglassId,
//     });

//   const overview = spyglass?.overview ?? "";
//   const findings = spyglass?.findings ?? [];
//   const baseQuery = spyglass?.baseQuery;
//   const results = fullResults;

//   useDocumentTitle(baseQuery ? `${baseQuery} - Noeko` : "Noeko");

//   const {
//     elements: {
//       leftSidebar: {
//         mode: { set: setLeftSidebar },
//       },
//     },
//   } = useLayout();

//   return (
//     <PageWrapper>
//       <LeftSidebar
//         topLevel={{
//           open: (
//             <>
//               <Link to="/spyglass/history">
//                 <ActionIcon color="gray" radius="lg" variant="light">
//                   <ClockCounterClockwiseIcon />
//                 </ActionIcon>
//               </Link>
//             </>
//           ),
//         }}
//       >
//         <LeftSidebar.Open>
//           {!!spyglass && citationMap && results && (
//             <SpyglassContext citationMap={citationMap} results={results} />
//           )}
//         </LeftSidebar.Open>
//         <LeftSidebar.Collapsed>
//           <Stack>
//             {findings && findings.length > 0 && (
//               <ActionIcon
//                 variant="light"
//                 size="sm"
//                 radius="md"
//                 color="gray"
//                 onClick={() => {
//                   setLeftSidebar("open");
//                 }}
//               >
//                 <Text size="xs">{findings.length}</Text>
//               </ActionIcon>
//             )}
//             <Link to="/spyglass/history">
//               <ActionIcon color="gray" variant="light" size="sm">
//                 <ClockCounterClockwiseIcon />
//               </ActionIcon>
//             </Link>
//           </Stack>
//         </LeftSidebar.Collapsed>
//       </LeftSidebar>
//       <Content>
//         <Grid>
//           <Grid.Col>
//             <Link
//               to="/spyglass"
//               style={{
//                 textDecoration: "none",
//               }}
//             >
//               <Group c="dark.3" gap="xs">
//                 <CaretLeftIcon weight="bold" size={13} />
//                 <Text c="dark.3" size="sm">
//                   Back to Spyglass
//                 </Text>
//               </Group>
//             </Link>
//           </Grid.Col>
//           <Grid.Col>
//             <Text className={styles.queryHeader} size="lg" fs="italic">
//               {spyglass?.baseQuery ? spyglass?.baseQuery : "No title"}
//             </Text>
//           </Grid.Col>
//           {spyglass && (
//             <Grid.Col>
//               <div className={styles.overviewDisplay}>
//                 <DisplayOverview
//                   overview={overview}
//                   findings={findings}
//                   resultsMap={resultMap ?? {}}
//                   citationMap={citationMap ?? {}}
//                   query={baseQuery ?? ""}
//                   results={results ?? []}
//                   loading={loading}
//                 />
//               </div>
//             </Grid.Col>
//           )}
//         </Grid>
//       </Content>
//       <Nav />
//       <RightSidebar>
//         <RightSidebar.Open>
//           {!!spyglass && (
//             <SpyglassActions
//               intent={spyglass?.intent}
//               results={results ?? []}
//             />
//           )}
//         </RightSidebar.Open>
//       </RightSidebar>
//     </PageWrapper>
//   );
// }
