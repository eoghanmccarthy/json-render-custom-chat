import { createFileRoute } from "@tanstack/react-router";
import { ChatComponent } from "@/components/chat-component.tsx";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return <ChatComponent />;
}
