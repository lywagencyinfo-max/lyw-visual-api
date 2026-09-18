import { getAgent } from "@/lib/agent";
import { HomeClient } from "./HomeClient";

export default async function HomePage() {
  const agent = await getAgent();
  return <HomeClient agentSlug={agent.slug} agentName={agent.name} agentRole={agent.role} model={agent.model} tagline={agent.tagline} />;
}
