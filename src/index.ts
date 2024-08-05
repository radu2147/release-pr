import { getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type {
  PullRequestReviewCommentCreatedEvent,
  PullRequestReviewCommentEditedEvent,
} from "@octokit/webhooks-types";

const EYES_REACTION = "eyes";

async function run(): Promise<void> {
  try {
    const token = getInput("token", { required: true });

    const event = context.payload as
      | PullRequestReviewCommentCreatedEvent
      | PullRequestReviewCommentEditedEvent;

    const commentId = event?.comment?.id;
    const pr_number = event?.pull_request?.number;

    if (event?.pull_request?.draft || event?.pull_request?.state === "closed") {
      setFailed("The PR must be open and ready for review");
    }

    if (!event.comment?.body.trim().startsWith("/release")) {
      return;
    }

    if (!commentId) {
      setFailed(
        "No commentId was provided and this is not a comment related event."
      );
    }

    const octokit = getOctokit(token);

    await octokit.rest.reactions.createForIssueComment({
      ...context.repo,
      comment_id: Number(commentId),
      content: EYES_REACTION,
    });

    await octokit.rest.pulls.merge({
      ...context.repo,
      pull_number: pr_number,
      merge_method: "merge",
    });

    await octokit.rest.repos.createRelease({
      ...context.repo,
      draft: false,
      tag_name: "1.0.0",
      generate_release_notes: true,
    });
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
  }
}

void run();
