import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PollResults } from "@/components/polls/poll-results";
import { PollBestSlots } from "@/components/polls/poll-best-slots";
import { PollActions } from "@/components/polls/poll-actions";
import { PollStatus } from "@/components/polls/poll-status";
import { Avatar } from "@/components/ui/avatar";
import { requireProfile } from "@/lib/auth";
import { formatMatchDate } from "@/lib/format";
import { getPollDetail } from "@/lib/queries";
import { weekRangeLabel } from "@/lib/week";
import { IconArrowLeft, IconClock, IconLock } from "@/components/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await requireProfile();
  const poll = await getPollDetail(id, profile.id);
  return { title: poll?.question ?? "Sondaggio" };
}

export default async function PollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const poll = await getPollDetail(id, profile.id);

  if (!poll) notFound();

  const canManage = poll.createdBy === profile.id || profile.is_admin;
  const matchCreatePath =
    profile.is_admin ? "/admin/matches" : profile.is_organizer ? "/matches/new" : null;

  return (
    <>
      <PageHeader
        back={
          <Link href="/polls" className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink">
            <IconArrowLeft className="size-4" />
            Tutti i sondaggi
          </Link>
        }
        title={poll.question}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={poll.creatorNickname} src={poll.creatorAvatarUrl} size="sm" className="size-5" />
              {poll.creatorNickname}
            </span>
            <span>{formatMatchDate(poll.createdAt)}</span>
            {poll.weekStart ? <span>{weekRangeLabel(poll.weekStart)}</span> : null}
            {poll.closesAt ? (
              <span className="inline-flex items-center gap-1.5">
                <IconClock className="size-4" />
                chiude il {formatMatchDate(poll.closesAt)}
              </span>
            ) : null}
          </span>
        }
        action={<PollStatus closed={poll.closed} />}
      />

      {poll.details ? (
        <p className="mb-5 rounded-card border border-rule bg-surface px-4 py-3 text-[13.5px] text-muted">
          {poll.details}
        </p>
      ) : null}

      {poll.closed || !poll.closesAt ? (
        <PollBestSlots poll={poll} matchCreatePath={matchCreatePath} />
      ) : null}

      <PollResults
        poll={poll}
        me={{
          profileId: profile.id,
          nickname: profile.nickname,
          avatarUrl: profile.avatar_url,
        }}
        matchCreatePath={matchCreatePath}
      />

      <div className="mt-6">
        <PollActions poll={poll} canManage={canManage} />
      </div>

      {poll.closed ? (
        <p className="mt-4 flex items-center gap-2 text-[12.5px] text-muted">
          <IconLock className="size-4" />
          Sondaggio chiuso: i voti restano visibili ma non si può più votare.
        </p>
      ) : null}
    </>
  );
}
