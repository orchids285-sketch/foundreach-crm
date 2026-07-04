import { type CoreApiClient } from 'twenty-client-sdk/core';

import { CallRecorderReconciliationAction } from 'src/logic-functions/constants/call-recorder-reconciliation-action';
import { UPCOMING_CALENDAR_EVENT_RECONCILIATION_BATCH_SIZE } from 'src/logic-functions/constants/upcoming-calendar-event-reconciliation-batch-size';
import { requestUpcomingCalendarEventsReconciliation } from 'src/logic-functions/data/request-upcoming-calendar-events-reconciliation.util';
import { reconcileCallRecorderForCalendarEventIds } from 'src/logic-functions/flows/reconcile-call-recorder.util';
import {
  type CallRecorderReconciliationActionCounts,
  type ReconcileUpcomingCalendarEventBatchesResult,
} from 'src/logic-functions/flows/reconcile-upcoming-calendar-event-batches-result.type';
import { type CallRecorderReconciliationResult } from 'src/logic-functions/types/call-recorder-reconciliation-result.type';

const ACTION_COUNT_KEY_BY_ACTION: {
  [Action in CallRecorderReconciliationResult['action']]: Lowercase<Action>;
} = {
  [CallRecorderReconciliationAction.CREATED]: 'created',
  [CallRecorderReconciliationAction.UPDATED]: 'updated',
  [CallRecorderReconciliationAction.CANCELED]: 'canceled',
  [CallRecorderReconciliationAction.SKIPPED]: 'skipped',
  [CallRecorderReconciliationAction.FAILED]: 'failed',
};

export const reconcileUpcomingCalendarEventBatches = async ({
  client,
  calendarEventIds,
  deadlineAtMs,
  getNowMs = () => Date.now(),
}: {
  client: CoreApiClient;
  calendarEventIds: string[];
  deadlineAtMs: number;
  getNowMs?: () => number;
}): Promise<ReconcileUpcomingCalendarEventBatchesResult> => {
  const remainingCalendarEventIds = [...calendarEventIds];
  const reconciledCalendarEventIds: string[] = [];
  const failedCalendarEventIds: string[] = [];
  const actionCounts: CallRecorderReconciliationActionCounts = {
    created: 0,
    updated: 0,
    canceled: 0,
    skipped: 0,
    failed: 0,
  };
  const failureCountByCalendarEventId = new Map<string, number>();
  let slowestBatchMs = 0;

  // Each id is re-queued at most once after a failed batch, so the loop and
  // the continuation chain stay bounded even when reconciliation keeps
  // failing.
  while (remainingCalendarEventIds.length > 0) {
    const batchCalendarEventIds = remainingCalendarEventIds.splice(
      0,
      UPCOMING_CALENDAR_EVENT_RECONCILIATION_BATCH_SIZE,
    );
    const batchStartedAtMs = getNowMs();

    try {
      const reconciliationResults =
        await reconcileCallRecorderForCalendarEventIds({
          client,
          calendarEventIds: batchCalendarEventIds,
        });

      reconciledCalendarEventIds.push(...batchCalendarEventIds);

      for (const reconciliationResult of reconciliationResults) {
        actionCounts[
          ACTION_COUNT_KEY_BY_ACTION[reconciliationResult.action]
        ] += 1;
      }
    } catch (error) {
      // A transient error must not drop events from the sweep: give every id
      // in the batch one more chance at the end of the queue before it is
      // recorded as failed.
      for (const calendarEventId of batchCalendarEventIds) {
        const failureCount =
          (failureCountByCalendarEventId.get(calendarEventId) ?? 0) + 1;

        failureCountByCalendarEventId.set(calendarEventId, failureCount);

        if (failureCount === 1) {
          remainingCalendarEventIds.push(calendarEventId);
        } else {
          failedCalendarEventIds.push(calendarEventId);
        }
      }

      if (process.env.NODE_ENV !== 'test') {
        console.error(
          `[call-recorder] upcoming calendar event batch reconciliation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    slowestBatchMs = Math.max(slowestBatchMs, getNowMs() - batchStartedAtMs);

    if (getNowMs() + slowestBatchMs > deadlineAtMs) {
      break;
    }
  }

  const continuationRequested =
    remainingCalendarEventIds.length > 0
      ? await requestUpcomingCalendarEventsReconciliation({
          calendarEventIds: remainingCalendarEventIds,
        })
      : false;

  return {
    reconciledCalendarEventIds,
    failedCalendarEventIds,
    remainingCalendarEventIds,
    actionCounts,
    continuationRequested,
  };
};
