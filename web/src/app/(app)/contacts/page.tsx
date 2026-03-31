import { EmptyState } from "@/components/ui/EmptyState";

export default function ContactsPage() {
  return (
    <EmptyState
      icon="👥"
      title="No contacts yet"
      description="Upload a CSV or let WhatsApp build your list automatically."
      cta={{ label: "Import CSV →" }}
    />
  );
}

