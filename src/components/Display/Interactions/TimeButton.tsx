import { Popover, Text, Stack, Divider, Group, Badge } from "@mantine/core";
import StatusButton from '@core/design/components/Interactions/StatusButton';
import { useState, useEffect } from "react";

/**
 * A button that displays the current time and reveals a
 * popover with more detailed date and time information on click.
 */
export default function TimeButton() {
  // State to hold the current date and time, updated every second.
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Set up an interval to update the time every second.
    const timer = setInterval(() => setNow(new Date()), 1000);

    // Clean up the interval when the component is unmounted.
    return () => clearInterval(timer);
  }, []);

  // --- In-file Formatting Logic ---

  const formatButtonTime = (date: Date): string => {
    // Format for the main button, e.g., "12:18 PM"
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getGreeting = (date: Date): string => {
    const hour = date.getHours();
    if (hour < 5) return "Good Night";
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getFullDate = (date: Date): string => {
    // e.g., "Tuesday, July 22, 2025"
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDetailedTime = (date: Date): string => {
    // e.g., "12:18:57 AM"
    return date.toLocaleTimeString("en-US");
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDayIndex = now.getDay();

  return (
    <Popover width={300} trapFocus position="bottom" withArrow shadow="md" radius="lg">
      <Popover.Target>
        <div style={{ height: "100%" }}>
          <StatusButton>
            <Text size="sm" fw="normal" lineClamp={0}>
              {formatButtonTime(now)}
            </Text>
          </StatusButton>
        </div>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          {/* --- Greeting & Full Date --- */}
          <Stack gap={0}>
            <Text size="lg" fw={700} ta="center">
              {getGreeting(now)}
            </Text>
            <Text ta="center" c="dimmed" size="sm">
              {getFullDate(now)}
            </Text>
          </Stack>

          <Divider />

          {/* --- Precise Live Clock --- */}
          <Text ta="center" size="3rem" fw={700} style={{ fontFamily: "heading", lineHeight: 1 }}>
            {getDetailedTime(now)}
          </Text>

          {/* --- Visual Day of the Week Indicator --- */}
          <Group justify="center" gap={5} mt="xs">
            {daysOfWeek.map((day, index) => (
              <Badge
                key={day}
                variant={index === currentDayIndex ? "filled" : "light"}
                color={index === currentDayIndex ? "blue" : "gray"}
                size="lg"
                radius="sm"
              >
                {day}
              </Badge>
            ))}
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
