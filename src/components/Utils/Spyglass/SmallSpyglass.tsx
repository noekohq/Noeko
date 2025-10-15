// import { Textarea } from "@mantine/core";
// import { IConnectable } from "../../../../app/services/Graph";
// import useSpyglass from "../../../pages/Spyglass/hooks/useSpyglass";
// import styles from "./SmallSpyglass.module.scss";
// import { useState } from "react";

// interface ISmallSpyglassProps {
//   scope?: string[];
//   placeholder?: string;
// }

// export default function SmallSpyglass({
//   scope,
//   placeholder,
// }: ISmallSpyglassProps) {
//   const [query, setQuery] = useState("");

//   return (
//     <div className={styles.smallSpyglass}>
//       <Textarea
//         minRows={1}
//         maxRows={4}
//         autosize
//         radius={"md"}
//         value={query}
//         onChange={(e) => setQuery(e.target.value)}
//         placeholder={placeholder}
//         classNames={{
//           input: `${styles.input}`,
//         }}
//         onKeyDown={(e) => {
//           if (!e.shiftKey && e.key === "Enter") {
//             e.preventDefault();
//             searchIdeas();
//           }
//         }}
//         rightSection={
//           loadingIdeas ? (
//             <Loader size="xs" />
//           ) : query.length > 0 ? (
//             <Flex direction="column" h="100%" justify="center">
//               <ActionIcon
//                 variant="light"
//                 size="sm"
//                 color="gray"
//                 onClick={clearResults}
//               >
//                 <X weight="bold" />
//               </ActionIcon>
//             </Flex>
//           ) : (
//             <MagnifyingGlassIcon />
//           )
//         }
//         ref={inputRef}
//         onBlur={() => {
//           onBlur && onBlur();
//         }}
//         onFocus={() => {}}
//       />
//     </div>
//   );
// }
