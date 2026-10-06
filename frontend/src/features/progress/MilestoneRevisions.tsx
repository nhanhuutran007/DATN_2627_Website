"use client";

import { useEffect, useState } from "react";

import { fetchMilestoneRevisions, type ApiMilestoneRevision, type MilestoneRevisionValues } from "@/lib/api/progress";
import { formatDateTime, formatDay, formatVnd } from "@/lib/format";

const FIELD_LABEL: Record<keyof MilestoneRevisionValues, string> = {
  title: "Tên mốc",
  description: "Mô tả",
  targetDate: "Hạn",
  budget: "Ngân sách",
};

function formatValue(field: keyof MilestoneRevisionValues, value: MilestoneRevisionValues[keyof MilestoneRevisionValues]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "targetDate") return formatDay(String(value));
  if (field === "budget") return formatVnd(Number(value));
  const text = String(value);
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

/** Lịch sử thay đổi kế hoạch sau khi phát hành — mỗi lần đổi kèm lý do công khai. */
export function MilestoneRevisions({ campaignId }: { campaignId: string }) {
  const [revisions, setRevisions] = useState<ApiMilestoneRevision[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchMilestoneRevisions(campaignId)
      .then((items) => {
        if (active) setRevisions(items);
      })
      .catch(() => {
        if (active) setRevisions([]);
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  if (!revisions || revisions.length === 0) return null;

  return (
    <details className="revision-log">
      <summary>Lịch sử thay đổi kế hoạch ({revisions.length})</summary>
      <ol>
        {revisions.map((revision) => {
          const fields = (Object.keys(revision.newValues) as (keyof MilestoneRevisionValues)[]).filter((field) => field in FIELD_LABEL);
          return (
            <li key={revision.id}>
              <p className="revision-head">
                <b>{revision.milestoneTitle}</b>
                <time dateTime={revision.createdAt}>{formatDateTime(revision.createdAt)}</time>
              </p>
              <ul className="revision-changes">
                {fields.map((field) => (
                  <li key={field}>
                    {FIELD_LABEL[field]}: <s>{formatValue(field, revision.oldValues[field])}</s> → <b>{formatValue(field, revision.newValues[field])}</b>
                  </li>
                ))}
              </ul>
              <p className="revision-reason">Lý do: {revision.reason}</p>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
