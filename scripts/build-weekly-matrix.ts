// 週次ワークフローのmatrixを動的に生成するスクリプト

interface ProviderConfig {
  provider: string;
  schemaType: "categorized" | "simple";
}

const PROVIDERS: ProviderConfig[] = [
  { provider: "github", schemaType: "categorized" },
  { provider: "aws", schemaType: "categorized" },
  { provider: "claudeCode", schemaType: "simple" },
  { provider: "githubCli", schemaType: "simple" },
  { provider: "linear", schemaType: "simple" },
];

// JSON Schema定義
const CATEGORIZED_SCHEMA = {
  type: "object",
  properties: {
    providerId: { type: "string" },
    highlights: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
    },
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          entries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                title: { type: "string" },
              },
              required: ["url", "title"],
            },
          },
          comment: { type: "string" },
          historicalContext: { type: "string" },
        },
        required: ["category", "entries", "comment", "historicalContext"],
      },
    },
  },
  required: ["providerId", "highlights", "categories"],
};

const SIMPLE_SCHEMA = {
  type: "object",
  properties: {
    providerId: { type: "string" },
    highlights: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
    },
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
        },
        required: ["url", "title"],
      },
    },
    overallComment: { type: "string" },
    historicalContext: { type: "string" },
  },
  required: [
    "providerId",
    "highlights",
    "entries",
    "overallComment",
    "historicalContext",
  ],
};

interface MatrixEntry {
  provider: string;
  json_schema: string;
}

interface BuildMatrixOptions {
  eventName: string;
  runInputs: Record<string, boolean>;
  hasData: Record<string, boolean>;
}

export function buildMatrix(
  options: BuildMatrixOptions,
): { include: MatrixEntry[] } {
  const { eventName, runInputs, hasData } = options;
  const include: MatrixEntry[] = [];

  for (const { provider, schemaType } of PROVIDERS) {
    // 実行条件: schedule実行 または (workflow_dispatch かつ input=true) かつ データあり
    const shouldRun = eventName !== "workflow_dispatch" ||
      runInputs[provider] === true;
    const providerHasData = hasData[provider] === true;

    if (shouldRun && providerHasData) {
      const schema = schemaType === "categorized"
        ? CATEGORIZED_SCHEMA
        : SIMPLE_SCHEMA;
      include.push({
        provider,
        json_schema: JSON.stringify(schema),
      });
    }
  }

  return { include };
}

function parseArgs(args: string[]): BuildMatrixOptions {
  const eventName =
    args.find((arg) => arg.startsWith("--event="))?.split("=")[1] ?? "schedule";

  const runInputs: Record<string, boolean> = {};
  const hasData: Record<string, boolean> = {};

  for (const { provider } of PROVIDERS) {
    const runArg = args.find((arg) => arg.startsWith(`--run-${provider}=`));
    runInputs[provider] = runArg?.split("=")[1] === "true";

    const hasArg = args.find((arg) => arg.startsWith(`--has-${provider}=`));
    hasData[provider] = hasArg?.split("=")[1] === "true";
  }

  return { eventName, runInputs, hasData };
}

if (import.meta.main) {
  const options = parseArgs(Deno.args);
  const matrix = buildMatrix(options);

  // GitHub Actions output形式で出力
  console.log(JSON.stringify(matrix));
}
