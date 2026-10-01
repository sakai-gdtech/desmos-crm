import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { authenticate } from "../iam/application/sessions.js";
import * as schema from "./schemas.js";
import * as crm from "./service.js";
const params = z.object({ kind: schema.kindSchema, id: schema.idSchema });
const entity = (request: FastifyRequest) => params.parse(request.params);
const tagId = (request: FastifyRequest) =>
  z.object({ id: schema.idSchema }).parse(request.params).id;
export async function crmRoutes(app: FastifyInstance) {
  app.get("/crm/assignees", async (request) =>
    crm.assignees(await authenticate(request)),
  );
  app.get("/crm/tags", async (request) =>
    crm.tags(await authenticate(request)),
  );
  app.post("/crm/tags", async (request, reply) =>
    reply
      .code(201)
      .send(
        await crm.createTag(
          await authenticate(request),
          schema.tagCreate.parse(request.body),
        ),
      ),
  );
  app.patch("/crm/tags/:id", async (request) =>
    crm.updateTag(
      await authenticate(request),
      tagId(request),
      schema.tagPatch.parse(request.body),
    ),
  );
  app.delete("/crm/tags/:id", async (request, reply) => {
    await crm.removeTag(await authenticate(request), tagId(request));
    return reply.code(204).send();
  });
  app.get("/crm/:kind", async (request) => {
    const { kind } = z
      .object({ kind: schema.kindSchema })
      .parse(request.params);
    return crm.list(
      await authenticate(request),
      kind,
      schema.listSchema.parse(request.query),
    );
  });
  app.post("/crm/:kind", async (request, reply) => {
    const { kind } = z
      .object({ kind: schema.kindSchema })
      .parse(request.params);
    return reply
      .code(201)
      .send(
        await crm.create(
          await authenticate(request),
          kind,
          schema.createSchema(kind).parse(request.body),
        ),
      );
  });
  app.get("/crm/:kind/:id", async (request) => {
    const { kind, id } = entity(request);
    return crm.detail(await authenticate(request), kind, id);
  });
  app.patch("/crm/:kind/:id", async (request) => {
    const { kind, id } = entity(request);
    return crm.update(
      await authenticate(request),
      kind,
      id,
      schema.patchSchema(kind).parse(request.body),
    );
  });
  app.delete("/crm/:kind/:id", async (request, reply) => {
    const { kind, id } = entity(request);
    await crm.remove(await authenticate(request), kind, id);
    return reply.code(204).send();
  });
  app.post("/crm/:kind/:id/restore", async (request) => {
    const { kind, id } = entity(request);
    z.object({})
      .strict()
      .parse(request.body ?? {});
    return crm.restore(await authenticate(request), kind, id);
  });
  app.delete("/crm/:kind/:id/permanent", async (request, reply) => {
    const { kind, id } = entity(request);
    await crm.purge(await authenticate(request), kind, id);
    return reply.code(204).send();
  });
  app.get("/crm/:kind/:id/timeline", async (request) => {
    const { kind, id } = entity(request);
    return crm.timeline(
      await authenticate(request),
      kind,
      id,
      schema.pagination.strict().parse(request.query),
    );
  });
  app.get("/crm/:kind/:id/notes", async (request) => {
    const { kind, id } = entity(request);
    return crm.notes(await authenticate(request), kind, id);
  });
  app.post("/crm/:kind/:id/notes", async (request, reply) => {
    const { kind, id } = entity(request);
    return reply
      .code(201)
      .send(
        await crm.createNote(
          await authenticate(request),
          kind,
          id,
          schema.noteCreate.parse(request.body),
        ),
      );
  });
  app.patch("/crm/:kind/:id/notes/:noteId", async (request) => {
    const { kind, id, noteId } = params
      .extend({ noteId: schema.idSchema })
      .parse(request.params);
    return crm.updateNote(
      await authenticate(request),
      kind,
      id,
      noteId,
      schema.notePatch.parse(request.body),
    );
  });
  app.delete("/crm/:kind/:id/notes/:noteId", async (request, reply) => {
    const { kind, id, noteId } = params
      .extend({ noteId: schema.idSchema })
      .parse(request.params);
    await crm.removeNote(await authenticate(request), kind, id, noteId);
    return reply.code(204).send();
  });
  app.post("/crm/leads/:id/convert", async (request) =>
    crm.convert(
      await authenticate(request),
      tagId(request),
      schema.conversion.parse(request.body ?? {}),
    ),
  );
}
