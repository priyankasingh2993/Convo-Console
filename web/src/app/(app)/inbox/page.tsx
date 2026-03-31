import { EmptyState } from "@/components/ui/EmptyState";

export default function InboxPage() {
  return (
    <EmptyState
      icon="💬"
      title="No conversations yet"
      description="Customers who message your number appear here."
      cta={{ label: "Connect WhatsApp →", href: "/settings/whatsapp" }}
    />
  );
}

