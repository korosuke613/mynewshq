import { graphql } from "@octokit/graphql";

interface GetCommentParentResult {
  node: {
    replyTo: { id: string } | null;
  } | null;
}

interface AddDiscussionCommentInput {
  discussionId: string;
  body: string;
  replyToId?: string;
}

interface AddDiscussionCommentResult {
  addDiscussionComment: {
    comment: {
      id: string;
      url: string;
    };
  };
}

interface GetDiscussionResult {
  repository: {
    discussion: {
      id: string;
      title: string;
    };
  };
}

const GET_COMMENT_PARENT_QUERY = `
  query GetCommentParent($id: ID!) {
    node(id: $id) {
      ... on DiscussionComment {
        replyTo {
          id
        }
      }
    }
  }
`;

const ADD_DISCUSSION_COMMENT_MUTATION = `
  mutation AddDiscussionComment($input: AddDiscussionCommentInput!) {
    addDiscussionComment(input: $input) {
      comment {
        id
        url
      }
    }
  }
`;

const GET_DISCUSSION_QUERY = `
  query GetDiscussion($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      discussion(number: $number) {
        id
        title
      }
    }
  }
`;

export async function resolveReplyToId(
  graphqlWithAuth: typeof graphql,
  replyToId: string,
): Promise<string> {
  try {
    const result = await graphqlWithAuth<GetCommentParentResult>(
      GET_COMMENT_PARENT_QUERY,
      { id: replyToId },
    );
    if (result.node?.replyTo) {
      console.log(
        `Comment ${replyToId} is a threaded reply. Using parent comment ${result.node.replyTo.id} as replyToId.`,
      );
      return result.node.replyTo.id;
    }
    return replyToId;
  } catch (error) {
    console.warn(
      `Warning: Failed to resolve replyToId ${replyToId}, using original value:`,
      error,
    );
    return replyToId;
  }
}

async function replyToDiscussion(
  owner: string,
  repo: string,
  discussionNumber: number,
  replyBody: string,
  token: string,
  replyToId?: string,
): Promise<string> {
  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });

  try {
    // まず、Discussion IDを取得
    console.log(`Getting discussion #${discussionNumber}...`);
    const discussionResult = await graphqlWithAuth<GetDiscussionResult>(
      GET_DISCUSSION_QUERY,
      {
        owner,
        name: repo,
        number: discussionNumber,
      },
    );

    const discussionId = discussionResult.repository.discussion.id;
    console.log(`Discussion ID: ${discussionId}`);

    // replyToId が Level 2 コメントの場合、親コメントのIDに解決する
    let resolvedReplyToId = replyToId;
    if (replyToId) {
      resolvedReplyToId = await resolveReplyToId(graphqlWithAuth, replyToId);
    }

    // コメントを投稿
    const isReply = resolvedReplyToId !== undefined;
    console.log(
      isReply
        ? `Adding reply to comment ${resolvedReplyToId}...`
        : "Adding comment to discussion...",
    );
    const input: AddDiscussionCommentInput = {
      discussionId,
      body: replyBody,
    };
    if (resolvedReplyToId) {
      input.replyToId = resolvedReplyToId;
    }
    const result = await graphqlWithAuth<AddDiscussionCommentResult>(
      ADD_DISCUSSION_COMMENT_MUTATION,
      { input },
    );

    console.log(
      `Comment added successfully: ${result.addDiscussionComment.comment.url}`,
    );
    return result.addDiscussionComment.comment.url;
  } catch (error) {
    console.error("Error adding comment to discussion:", error);
    throw error;
  }
}

async function main(): Promise<void> {
  const args = Deno.args;

  if (args.length < 2 || args.length > 5) {
    console.error(
      "Usage: deno run reply-discussion.ts <discussion-number> <body> [reply-to-id]",
    );
    console.error(
      "  or: deno run reply-discussion.ts <discussion-number> <owner> <repo> <body> [reply-to-id]",
    );
    Deno.exit(1);
  }

  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }

  let discussionNumber: number;
  let owner: string;
  let repo: string;
  let body: string;
  let replyToId: string | undefined;

  if (args.length >= 4) {
    // Format: <discussion-number> <owner> <repo> <body> [reply-to-id]
    discussionNumber = parseInt(args[0], 10);
    owner = args[1];
    repo = args[2];
    body = args[3];
    replyToId = args[4];
  } else {
    // Format: <discussion-number> <body> [reply-to-id] (uses GITHUB_REPOSITORY)
    discussionNumber = parseInt(args[0], 10);
    body = args[1];
    replyToId = args[2];

    const githubRepository = Deno.env.get("GITHUB_REPOSITORY");
    if (!githubRepository) {
      console.error(
        "GITHUB_REPOSITORY environment variable is required when owner/repo are not specified",
      );
      Deno.exit(1);
    }

    [owner, repo] = githubRepository.split("/");
  }

  if (isNaN(discussionNumber)) {
    console.error("Discussion number must be a valid integer");
    Deno.exit(1);
  }

  try {
    const commentUrl = await replyToDiscussion(
      owner,
      repo,
      discussionNumber,
      body,
      token,
      replyToId,
    );
    console.log(
      replyToId
        ? `Successfully added reply to comment in discussion #${discussionNumber}`
        : `Successfully added comment to discussion #${discussionNumber}`,
    );
    console.log(`Comment URL: ${commentUrl}`);
  } catch (error) {
    console.error("Failed to add comment to discussion:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
