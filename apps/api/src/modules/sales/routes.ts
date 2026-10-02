import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../iam/application/sessions.js";
import { noteCreate, notePatch } from "../crm/schemas.js";
import * as rules from "./rules.js";
import * as fields from "../crm/fields.js";
import * as s from "./schemas.js";
import * as presentation from "./presentation.js";
import * as service from "./service.js";
const params = z.object({ id: z.uuid() });
export async function salesRoutes(app: FastifyInstance) {
  app.get("/sales/rules", async (req) =>
    rules.rules(
      await authenticate(req),
      z.object({ pipelineId: z.uuid() }).strict().parse(req.query).pipelineId,
    ),
  );
  app.post("/sales/rules", async (req, reply) =>
    reply
      .code(201)
      .send(
        await rules.saveRule(
          await authenticate(req),
          rules.ruleInput.parse(req.body),
        ),
      ),
  );
  app.patch("/sales/rules/:id", async (req) =>
    rules.saveRule(
      await authenticate(req),
      rules.ruleInput.parse(req.body),
      params.parse(req.params).id,
    ),
  );
  app.post("/sales/rules/scan", async (req) =>
    rules.scan(
      await authenticate(req),
      z.object({ pipelineId: z.uuid() }).strict().parse(req.body).pipelineId,
    ),
  );
  app.get("/notifications", async (req) =>
    rules.notifications(await authenticate(req)),
  );
  app.post("/notifications/:id/read", async (req) => {
    z.object({})
      .strict()
      .parse(req.body ?? {});
    return rules.readNotification(
      await authenticate(req),
      params.parse(req.params).id,
    );
  });

  app.get("/sales/deals/:id/fields", async (req) =>
    fields.fieldValues(
      await authenticate(req),
      "deals",
      params.parse(req.params).id,
    ),
  );
  app.put("/sales/deals/:id/fields", async (req) =>
    fields.fieldValues(
      await authenticate(req),
      "deals",
      params.parse(req.params).id,
      fields.valuesInput.parse(req.body),
    ),
  );

  app.get("/sales/dashboard", async (req) =>
    presentation.dashboard(
      await authenticate(req),
      presentation.dashboardQuery.parse(req.query),
    ),
  );
  app.get("/sales/products", async (req) =>
    presentation.products(await authenticate(req)),
  );
  app.post("/sales/products", async (req, reply) =>
    reply
      .code(201)
      .send(
        await presentation.saveProduct(
          await authenticate(req),
          presentation.productInput.parse(req.body),
        ),
      ),
  );
  app.patch("/sales/products/:id", async (req) =>
    presentation.saveProduct(
      await authenticate(req),
      presentation.productInput.parse(req.body),
      params.parse(req.params).id,
    ),
  );
  app.get("/sales/deals/:id/proposal", async (req) =>
    presentation.proposal(await authenticate(req), params.parse(req.params).id),
  );
  app.put("/sales/deals/:id/proposal", async (req) =>
    presentation.saveProposal(
      await authenticate(req),
      params.parse(req.params).id,
      presentation.proposalInput.parse(req.body),
    ),
  );
  app.get("/sales/pipelines/:id/demo-automation", async (req) =>
    presentation.demoAutomation(
      await authenticate(req),
      params.parse(req.params).id,
    ),
  );
  app.patch("/sales/pipelines/:id/demo-automation", async (req) => {
    const input = z
      .object({
        enabled: z.boolean(),
        stageId: z.uuid().optional(),
        version: z.number().int().positive().optional(),
      })
      .strict()
      .parse(req.body);
    return presentation.demoAutomation(
      await authenticate(req),
      params.parse(req.params).id,
      input.enabled,
      input.stageId,
      input.version,
    );
  });
  app.get("/sales/pipelines", async (req) =>
    service.pipelines(await authenticate(req)),
  );
  app.post("/sales/pipelines", async (req, reply) =>
    reply
      .code(201)
      .send(
        await service.createPipeline(
          await authenticate(req),
          s.pipelineCreate.parse(req.body),
        ),
      ),
  );
  app.get("/sales/pipelines/:id", async (req) =>
    service.pipelineDetail(
      await authenticate(req),
      params.parse(req.params).id,
    ),
  );
  app.patch("/sales/pipelines/:id", async (req) =>
    service.updatePipeline(
      await authenticate(req),
      params.parse(req.params).id,
      s.pipelinePatch.parse(req.body),
    ),
  );
  app.delete("/sales/pipelines/:id", async (req, reply) => {
    await service.deletePipeline(
      await authenticate(req),
      params.parse(req.params).id,
    );
    return reply.code(204).send();
  });
  app.get("/sales/board", async (req) =>
    service.board(await authenticate(req), s.board.parse(req.query)),
  );
  for (const kind of ["deals", "activities", "tasks"] as const) {
    app.get(`/sales/${kind}`, async (req) =>
      service.list(await authenticate(req), kind, s.list.parse(req.query)),
    );
    app.post(`/sales/${kind}`, async (req, reply) => {
      const input = (
        kind === "deals"
          ? s.dealCreate
          : kind === "activities"
            ? s.activityCreate
            : s.taskCreate
      ).parse(req.body);
      const ctx = await authenticate(req);
      return reply
        .code(201)
        .send(
          kind === "deals"
            ? await service.createDeal(ctx, input)
            : await service.createWork(ctx, kind, input),
        );
    });
    app.get(`/sales/${kind}/:id`, async (req) =>
      service.detail(
        await authenticate(req),
        kind,
        params.parse(req.params).id,
      ),
    );
    app.patch(`/sales/${kind}/:id`, async (req) =>
      service.update(
        await authenticate(req),
        kind,
        params.parse(req.params).id,
        (kind === "deals"
          ? s.dealPatch
          : kind === "activities"
            ? s.activityPatch
            : s.taskPatch
        ).parse(req.body),
      ),
    );
    app.delete(`/sales/${kind}/:id`, async (req, reply) => {
      await service.remove(
        await authenticate(req),
        kind,
        params.parse(req.params).id,
      );
      return reply.code(204).send();
    });
    app.post(`/sales/${kind}/:id/restore`, async (req) => {
      z.object({})
        .strict()
        .parse(req.body ?? {});
      return service.restore(
        await authenticate(req),
        kind,
        params.parse(req.params).id,
      );
    });
  }
  app.get("/sales/deals/:id/timeline", async (req) =>
    service.timeline(
      await authenticate(req),
      params.parse(req.params).id,
      s.pagination.strict().parse(req.query),
    ),
  );
  app.get("/sales/deals/:id/notes", async (req) =>
    service.notes(await authenticate(req), params.parse(req.params).id),
  );
  app.post("/sales/deals/:id/notes", async (req, reply) =>
    reply
      .code(201)
      .send(
        await service.saveNote(
          await authenticate(req),
          params.parse(req.params).id,
          noteCreate.parse(req.body),
        ),
      ),
  );
  app.patch("/sales/deals/:id/notes/:noteId", async (req) => {
    const p = params.extend({ noteId: z.uuid() }).parse(req.params);
    return service.saveNote(
      await authenticate(req),
      p.id,
      notePatch.parse(req.body),
      p.noteId,
    );
  });
  app.delete("/sales/deals/:id/notes/:noteId", async (req, reply) => {
    const p = params.extend({ noteId: z.uuid() }).parse(req.params);
    await service.deleteNote(await authenticate(req), p.id, p.noteId);
    return reply.code(204).send();
  });
  app.post("/sales/leads/:id/convert", async (req) =>
    service.convert(
      await authenticate(req),
      params.parse(req.params).id,
      s.conversion.parse(req.body),
    ),
  );
}
