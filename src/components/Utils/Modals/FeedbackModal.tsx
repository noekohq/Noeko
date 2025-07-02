// components/LeftSidebar/FeedbackModal.tsx
import { Modal, Grid, Textarea, Checkbox, Group, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import useFetch from "../../../hooks/useFetch"; // Adjust path
import {
  IFeedback,
  IFeedbackForm,
} from "../../../../app/database/models/feedback"; // Adjust path
import { useAuth } from "../../../contexts/AuthContext"; // Adjust path
import { useLocation } from "react-router";

type FeedbackModalProps = {
  opened: boolean;
  onClose: () => void;
};

export default function FeedbackModal({ opened, onClose }: FeedbackModalProps) {
  const { user } = useAuth();

  const { pathname } = useLocation();

  const feedbackForm = useForm<Partial<IFeedbackForm>>({
    initialValues: {
      content: ``,
      consentToContact: true,
    },
    validate: {
      content: (value) =>
        value && value.trim() ? null : "Feedback content cannot be empty.",
    },
  });

  const { load: createFeedback, loading: loadingFeedback } = useFetch<
    Omit<IFeedbackForm, "status">,
    IFeedback
  >({
    url: "/feedback",
    method: "POST",
    body: {
      ...feedbackForm.values,
    } as Omit<IFeedbackForm, "status">,
    dependencies: [feedbackForm.values],
    onSuccess: () => {
      showNotification({
        title: "Success",
        message: "Thank you for your valuable feedback!",
        color: "teal",
      });
      feedbackForm.reset();
      onClose();
    },
    onError: (error) => {
      // It's good practice for onError to receive the error object
      console.error("Feedback submission error:", error);
      showNotification({
        title: "Submission Error",
        message:
          "Something went wrong submitting your feedback. Please try again.",
        color: "red",
      });
    },
  });
  // --- End Custom useFetch Hook Usage ---

  const handleSubmitFeedback = async () => {
    const validationResult = feedbackForm.validate();
    if (validationResult.hasErrors) {
      showNotification({
        title: "Validation Error",
        message:
          "Please correct the errors in the form. The first error is: " +
          Object.values(validationResult.errors)[0],
        color: "orange",
      });
      return;
    }

    await createFeedback();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Submit Feedback" centered>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitFeedback();
        }}
      >
        <Grid>
          <Grid.Col span={12}>
            <Textarea
              label="Your Feedback"
              placeholder="We'd love to hear your thoughts..."
              minRows={10}
              required
              data-autofocus
              {...feedbackForm.getInputProps("content")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Checkbox
              label="May we contact you about this feedback?"
              description={
                user?.email
                  ? `If needed, we'll use: ${user.email}`
                  : "We might want to follow up."
              }
              {...feedbackForm.getInputProps("consentToContact", {
                type: "checkbox",
              })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  feedbackForm.reset();
                  onClose();
                }}
                disabled={loadingFeedback}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loadingFeedback}>
                Submit Feedback
              </Button>
            </Group>
          </Grid.Col>
        </Grid>
      </form>
    </Modal>
  );
}
