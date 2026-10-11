import "server-only";

export class RequestBodyError extends Error {
  constructor(public status: 400 | 413) { super(status === 413 ? "Request too large." : "Invalid JSON request."); }
}

/** Enforce bytes while reading, including chunked requests without Content-Length. */
export async function readJsonBody(request: Request, limit: number): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > limit) throw new RequestBodyError(413);
  if (!request.body) throw new RequestBodyError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new RequestBodyError(413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400);
  } finally { reader.releaseLock(); }
}
