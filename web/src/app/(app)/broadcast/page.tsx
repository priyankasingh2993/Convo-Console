import { EmptyState } from "@/components/ui/EmptyState";

export default function BroadcastPage() {
  return (
    <EmptyState
      icon="📢"
      title="No campaigns yet"
      description="Send your first broadcast in minutes."
      cta={{ label: "New Campaign →" }}
    />
  );
}

