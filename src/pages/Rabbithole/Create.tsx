import { Title } from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import {
  IRabbithole,
  IRabbitholeForm,
} from "../../../app/database/models/rabbithole";
import { useForm } from "@mantine/form";

export default function CreateRabbithole() {
  const form = useForm({
    initialValues: {
      name: "",
    },
    validate: {
      name: (value) => value.length > 0 || "Name is required",
    },
  });

  const { load: createRabbithole, loading: creatingRabbithole } = useFetch<
    IRabbitholeForm,
    IRabbithole
  >({
    url: "/rabbithole",
    method: "POST",
    body: { ...form.getTransformedValues() },
    dependencies: [form.values],
  });

  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>
        <Title>New Rabbithole</Title>
      </Content>
      <RightSidebar />
    </PageWrapper>
  );
}
