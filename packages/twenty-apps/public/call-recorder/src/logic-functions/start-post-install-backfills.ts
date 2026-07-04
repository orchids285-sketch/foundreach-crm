import { isUndefined } from '@sniptt/guards';
import {
  definePostInstallLogicFunction,
  type InstallPayload,
} from 'twenty-sdk/define';

import { START_POST_INSTALL_BACKFILLS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/start-post-install-backfills-logic-function-universal-identifier';
import { CalendarEventSweepKickoffOutcome } from 'src/logic-functions/constants/calendar-event-sweep-kickoff-outcome';
import { SummaryBackfillKickoffOutcome } from 'src/logic-functions/constants/summary-backfill-kickoff-outcome';
import { requestCallRecordingSummariesBackfill } from 'src/logic-functions/data/request-call-recording-summaries-backfill.util';
import { requestUpcomingCalendarEventsReconciliation } from 'src/logic-functions/data/request-upcoming-calendar-events-reconciliation.util';

type SweepOutcomes = typeof CalendarEventSweepKickoffOutcome;
type BackfillOutcomes = typeof SummaryBackfillKickoffOutcome;

// Failures are represented by the throw below, so the result only carries the
// success outcomes.
type StartPostInstallBackfillsResult = {
  calendarEventSweepOutcome: SweepOutcomes['SWEEP_REQUESTED'];
  summaryBackfillOutcome:
    | BackfillOutcomes['SKIPPED_INITIAL_INSTALL']
    | BackfillOutcomes['BACKFILL_REQUESTED'];
};

export const startPostInstallBackfillsHandler = async ({
  previousVersion,
}: InstallPayload): Promise<StartPostInstallBackfillsResult> => {
  const calendarEventSweepRequested =
    await requestUpcomingCalendarEventsReconciliation();

  const summaryBackfillOutcome = isUndefined(previousVersion)
    ? SummaryBackfillKickoffOutcome.SKIPPED_INITIAL_INSTALL
    : (await requestCallRecordingSummariesBackfill())
      ? SummaryBackfillKickoffOutcome.BACKFILL_REQUESTED
      : SummaryBackfillKickoffOutcome.BACKFILL_REQUEST_FAILED;

  if (
    !calendarEventSweepRequested ||
    summaryBackfillOutcome ===
      SummaryBackfillKickoffOutcome.BACKFILL_REQUEST_FAILED
  ) {
    const failedKickoffs = [
      ...(calendarEventSweepRequested
        ? []
        : ['upcoming calendar event sweep']),
      ...(summaryBackfillOutcome ===
      SummaryBackfillKickoffOutcome.BACKFILL_REQUEST_FAILED
        ? ['call recording summary backfill']
        : []),
    ];

    throw new Error(
      `[call-recorder] Failed to start post-install backfills: ${failedKickoffs.join(
        ', ',
      )}`,
    );
  }

  return {
    calendarEventSweepOutcome: CalendarEventSweepKickoffOutcome.SWEEP_REQUESTED,
    summaryBackfillOutcome,
  };
};

export default definePostInstallLogicFunction({
  universalIdentifier:
    START_POST_INSTALL_BACKFILLS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'start-post-install-backfills',
  description:
    'Starts backfill workers when Call Recorder is installed or upgraded in a workspace: sweeps upcoming calendar events so meetings created before installation get recording bots, and (on upgrades) generates missing call recording summaries.',
  timeoutSeconds: 30,
  shouldRunOnVersionUpgrade: true,
  handler: startPostInstallBackfillsHandler,
});
