import test from "node:test";
import assert from "node:assert/strict";
import {
  GITHUB_QUERY,
  normalizeMetrics,
  normalizeProfile,
  requestProfile,
} from "../lib/github-client";
import { PublicError } from "../lib/types";
import { day, githubPayload } from "./fixtures";

const stub =
  (value: unknown, status = 200, headers?: HeadersInit): typeof fetch =>
  async () =>
    Response.json(value, { status, headers });
const failsWith = (status: number) => (error: unknown) =>
  error instanceof PublicError &&
  error.status === status &&
  !error.message.includes("test-secret");

test("a real-shaped response is normalized and totals stay exact", () => {
  const profile = normalizeProfile(githubPayload(), "2026-11-03T12:00:00Z");
  assert.equal(profile.total, 5);
  assert.deepEqual(profile.stats, {
    activeDays: 2,
    currentStreak: 2,
    longestStreak: 2,
  });
  const empty = normalizeProfile(
    githubPayload([day("2026-11-03", 0)]),
    "2026-11-03T12:00:00Z",
  );
  assert.equal(empty.total, 0);
});
test("incomplete/malformed/duplicate data never becomes a zero profile", () => {
  assert.throws(
    () => normalizeProfile({}, "2026-11-03T12:00:00Z"),
    failsWith(503),
  );
  const data = githubPayload();
  data.user.contributionsCollection.contributionCalendar.totalContributions = 0;
  assert.throws(
    () => normalizeProfile(data, "2026-11-03T12:00:00Z"),
    failsWith(503),
  );
  assert.throws(
    () =>
      normalizeProfile(
        githubPayload([day("2026-11-03"), day("2026-11-03")]),
        "2026-11-03T12:00:00Z",
      ),
    failsWith(503),
  );
});
test("missing credentials and invalid inputs fail before any upstream fetch", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    throw new Error("Must not call");
  };
  await assert.rejects(
    requestProfile("uzuw", undefined, fetcher),
    failsWith(503),
  );
  await assert.rejects(
    requestProfile("https://bad", "test-secret", fetcher),
    failsWith(400),
  );
  assert.equal(calls, 0);
});
test("GraphQL HTTP 200 errors, missing users, network failures, and auth errors are explicit", async () => {
  await assert.rejects(
    requestProfile(
      "uzuw",
      "test-secret",
      stub({ errors: [{ type: "NOT_FOUND", message: "test-secret" }] }),
    ),
    failsWith(404),
  );
  await assert.rejects(
    requestProfile("uzuw", "test-secret", stub({ data: { user: null } })),
    failsWith(404),
  );
  await assert.rejects(
    requestProfile(
      "uzuw",
      "test-secret",
      stub({ errors: [{ type: "FORBIDDEN", message: "test-secret" }] }),
    ),
    failsWith(503),
  );
  await assert.rejects(
    requestProfile("uzuw", "test-secret", stub({ errors: [null] })),
    failsWith(503),
  );
  for (const data of [
    undefined,
    [],
    { user: { ...githubPayload().user, repositories: undefined } },
  ])
    await assert.rejects(
      requestProfile("uzuw", "test-secret", stub({ data })),
      failsWith(503),
    );
  await assert.rejects(
    requestProfile("uzuw", "test-secret", stub({}, 401)),
    failsWith(503),
  );
  await assert.rejects(
    requestProfile("uzuw", "test-secret", async () => {
      throw new Error("test-secret");
    }),
    failsWith(503),
  );
});
test("quotas preserve retry delay, including secondary limits; the final successful request is usable", async () => {
  await assert.rejects(
    requestProfile(
      "uzuw",
      "test-secret",
      stub({}, 429, { "retry-after": "123" }),
    ),
    (error) =>
      failsWith(429)(error) && (error as PublicError).retryAfter === 123,
  );
  await assert.rejects(
    requestProfile(
      "uzuw",
      "test-secret",
      stub({}, 403, { "retry-after": "60" }),
    ),
    failsWith(429),
  );
  await assert.rejects(
    requestProfile(
      "uzuw",
      "test-secret",
      stub({ errors: [{ type: "RATE_LIMITED" }] }),
    ),
    failsWith(429),
  );
  assert.equal(
    (
      await requestProfile(
        "uzuw",
        "test-secret",
        stub({ data: githubPayload() }, 200, { "x-ratelimit-remaining": "0" }),
      )
    ).total,
    5,
  );
});
test("query uses a variable and fixed GitHub origin, not arbitrary fetch targets", async () => {
  await requestProfile("UZUW", "test-secret", async (url, init) => {
    assert.equal(url, "https://api.github.com/graphql");
    assert.deepEqual(JSON.parse(String(init?.body)).variables, {
      login: "uzuw",
    });
    assert.equal(init?.method, "POST");
    return Response.json({ data: githubPayload() });
  });
});

test("public owned repositories paginate completely before stars and top repos are published", async () => {
  const data = githubPayload();
  const repo = (name: string, stars: number) => ({
    name,
    description: null,
    stargazerCount: stars,
    forkCount: 0,
    isPrivate: false,
    owner: { login: "octocat" },
  });
  data.user.repositories = {
    totalCount: 2,
    nodes: [repo("first", 9)],
    pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
  };
  let calls = 0;
  const profile = await requestProfile(
    "octocat",
    "test-secret",
    async (_, init) => {
      const body = JSON.parse(String(init?.body));
      calls++;
      if (calls === 1) return Response.json({ data });
      assert.deepEqual(body.variables, { login: "octocat", after: "cursor-1" });
      return Response.json({
        data: {
          user: {
            repositories: {
              totalCount: 2,
              nodes: [repo("second", 3)],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      });
    },
  );
  assert.equal(calls, 2);
  assert.equal(profile.repositories?.stars, 12);
  assert.deepEqual(
    profile.repositories?.top.map((r) => r.name),
    ["first", "second"],
  );
  assert.equal(profile.activity?.pullRequests, 3);
  assert.match(GITHUB_QUERY, /privacy: PUBLIC/);
  assert.match(GITHUB_QUERY, /ownerAffiliations: \[OWNER\]/);
});

test("missing metrics, private repository data, or a failed later page never become partial successes", async () => {
  const data = githubPayload();
  delete (
    data.user.contributionsCollection as Partial<
      typeof data.user.contributionsCollection
    >
  ).totalPullRequestContributions;
  await assert.rejects(
    requestProfile("octocat", "test-secret", stub({ data })),
    failsWith(503),
  );
  const privateData = githubPayload();
  privateData.user.repositories.totalCount = 1;
  privateData.user.repositories.nodes = [
    {
      name: "secret",
      description: "private",
      stargazerCount: 8,
      forkCount: 0,
      isPrivate: true,
      owner: { login: "octocat" },
    },
  ];
  await assert.rejects(
    requestProfile("octocat", "test-secret", stub({ data: privateData })),
    failsWith(503),
  );
  privateData.user.repositories.nodes[0].isPrivate = false;
  privateData.user.repositories.totalCount = 2;
  privateData.user.repositories.pageInfo = {
    hasNextPage: true,
    endCursor: "next",
  };
  let calls = 0;
  await assert.rejects(
    requestProfile("octocat", "test-secret", async () =>
      ++calls === 1
        ? Response.json({ data: privateData })
        : Response.json({}, { status: 429, headers: { "retry-after": "30" } }),
    ),
    failsWith(429),
  );
  assert.equal(calls, 2);
  await assert.rejects(
    requestProfile("octocat", "test-secret", stub({ data: privateData })),
    failsWith(503),
  );
  assert.throws(
    () => normalizeMetrics({ activity: {}, repositories: {} }),
    failsWith(503),
  );
});
