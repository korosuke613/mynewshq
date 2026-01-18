import { graphql } from "@octokit/graphql";

interface AddDiscussionCommentInput {
  discussionId: string;
  body: string;
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

async function replyToDiscussion(
  owner: string,
  repo: string,
  discussionNumber: number,
  replyBody: string,
  token: string,
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

    // コメントを投稿
    console.log("Adding comment to discussion...");
    const result = await graphqlWithAuth<AddDiscussionCommentResult>(
      ADD_DISCUSSION_COMMENT_MUTATION,
      {
        input: {
          discussionId,
          body: replyBody,
        } as AddDiscussionCommentInput,
      },
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

  if (args.length < 3) {
    console.error(
      "Usage: deno run reply-discussion.ts <discussion-number> <owner> <repo> [body]",
    );
    console.error(
      "  or: deno run reply-discussion.ts <discussion-number> <body> (uses GITHUB_REPOSITORY)",
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

  if (args.length === 4) {
    // Format: <discussion-number> <owner> <repo> <body>
    discussionNumber = parseInt(args[0], 10);
    owner = args[1];
    repo = args[2];
    body = args[3];
  } else {
    // Format: <discussion-number> <body> (uses GITHUB_REPOSITORY)
    discussionNumber = parseInt(args[0], 10);
    body = args[1];

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
    );
    console.log(
      `Successfully added comment to discussion #${discussionNumber}`,
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
