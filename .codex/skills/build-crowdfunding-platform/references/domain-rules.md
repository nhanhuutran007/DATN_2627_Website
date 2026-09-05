# Domain Rules

Read this reference when changing roles, campaigns, discovery, donations, progress reporting, administration, or AI behavior.

## Actors and permissions

- Guest: browse, search, filter, view campaign details, and register; never donate, comment, follow, or create campaigns.
- Backer: manage profile/preferences, receive recommendations, donate, follow, receive notifications, view receipts/progress, comment, report, and complain.
- Project owner: create and submit campaigns, provide evidence, monitor performance, answer the community, and publish progress/spending reports.
- Administrator: review users/campaigns, manage categories/content, monitor transactions, handle reports/refunds, inspect risk alerts, suspend entities, export statistics, and review audit logs.
- Allow one account to act as both backer and project owner. Check action-level permissions and resource ownership, not only a single role label.

## Campaign lifecycle

Use these conceptual states and validate every transition:

`DRAFT → PENDING_REVIEW → CHANGES_REQUESTED → PENDING_REVIEW → APPROVED → FUNDRAISING`

From `PENDING_REVIEW`, allow rejection with a reason. From `FUNDRAISING`, allow `PAUSED`, `SUCCESSFUL`, or `GOAL_NOT_MET`. Allow a justified administrator to resume a paused campaign. Close completed outcomes only after required reporting. Restrict or re-review material changes such as funding goal and deadline after publication.

## Campaign content

Capture category, media, story, funding target, start/end dates, implementation plan, budget, risks, reward/contribution tiers, milestones, evidence, and owner identity status. Validate required data before review.

Derive funding totals, supporter counts, and financial progress from verified transactions. Record time, actor, and version history for material changes.

## Discovery and community

Support full-text search, filters for category/location/target/progress/time/state, and ordering by popularity or time. Present story, owner, funding data, milestones, evidence, updates, comments, and related projects on detail pages.

Moderate user-generated content. Record only necessary views, clicks, follows, searches, and donations. Respect user consent for personalization.

## Donations and transactions

- Create a unique donation order before redirecting to the payment sandbox.
- Accept state changes only from verified responses or signed webhooks.
- Make callback handling idempotent and cover success, failure, expiry, cancellation, duplication, and refund.
- Hide sensitive payer information from project owners and never store card details.
- Produce history, receipts, reconciliation filters, exports, and risk-review evidence.

## Progress and transparency

Track milestone deadline, expected budget, deliverable, completion, updates, media, receipts, and spending reports. Notify backers about milestones, schedule changes, and new reports. Request explanations for delays and expose an appropriate transparency status.

## AI responsibilities

- Recommendations: combine declared interests/content/popularity for cold start, then content and collaborative signals; diversify and account for campaign availability. Return a short reason and fall back to popular eligible campaigns.
- Success prediction: compare interpretable Logistic Regression with Random Forest or Gradient Boosting. Use category, target, duration, completeness, content/media quality, owner history, and permitted early engagement signals. Explain influential factors and never use the score as the sole rejection reason.
- Anomaly detection: combine business rules with supervised classification when labels exist or Isolation Forest/outlier methods otherwise. Return risk score, reason group, evidence, model/rule version, and review status.
- Keep administrators in the review loop. Store confirm/dismiss/request-verification feedback for later evaluation, not immediate unsupervised retraining.
- Evaluate ranking with Precision@K, Recall@K, and NDCG@K; success prediction with ROC-AUC, F1, precision, recall, and calibration; alerts with threshold-specific precision/recall and false-alert rate.
