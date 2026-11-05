export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Wraps a route handler so failures always reach the client as JSON.
export function route(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof ApiError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return Response.json(
        { error: "Something went wrong. Is the MongoDB service running?" },
        { status: 500 },
      );
    }
  };
}

// Requiring a JSON content type makes browsers preflight cross-origin writes,
// so a website open in another tab can't post to this local API.
export async function readJson(request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError("Content-Type must be application/json", 415);
  }
  try {
    return await request.json();
  } catch {
    throw new ApiError("Request body is not valid JSON");
  }
}
