import { useLocation } from 'react-router';
import { z } from 'zod';

const NoticeStateSchema = z.object({ notice: z.string() });

/** Success message passed through navigation state after saving ("Guardado «Capuchino»"). */
export function useFlashNotice(): string | null {
  const location = useLocation();
  const parsed = NoticeStateSchema.safeParse(location.state as unknown);
  return parsed.success ? parsed.data.notice : null;
}

export function noticeState(notice: string) {
  return { notice } satisfies z.infer<typeof NoticeStateSchema>;
}
