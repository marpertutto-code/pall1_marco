import type { Metadata } from "next";
import { ChatRoom } from "@/components/chat/chat-room";
import { requireProfile } from "@/lib/auth";
import { listChatMessages, listProfiles } from "@/lib/queries";
import type { ChatAuthor } from "@/types/domain";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage() {
  const profile = await requireProfile();
  const [messages, profiles] = await Promise.all([listChatMessages(), listProfiles()]);

  const authors: ChatAuthor[] = profiles.map((player) => ({
    id: player.id,
    nickname: player.nickname,
    avatarUrl: player.avatar_url,
  }));

  return (
    <ChatRoom
      initialMessages={messages}
      authors={authors}
      currentProfileId={profile.id}
      canModerate={profile.is_admin}
    />
  );
}
