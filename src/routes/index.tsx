import { createFileRoute } from "@tanstack/react-router";
import { ChatComponent } from "@/components/chat-component.tsx";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <div className="bg-background w-full">
      <div className="mx-auto grid min-h-screen w-full max-w-2xl min-w-0 content-center items-start gap-8">
        <ChatComponent />
      </div>
    </div>
  );
}
