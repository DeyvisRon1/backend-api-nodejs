
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

const router = Router();

/**
 * Validación del body para crear una incidencia
 */
const CreateIssueSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres"),
  authorId: z.number().int().positive("authorId debe ser un número positivo"),
});

/**
 * POST /issues -> crea una incidencia
 */
router.post("/", async (req, res) => {
  const parsed = CreateIssueSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Datos inválidos",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const issue = await prisma.issue.create({ data: parsed.data });
    return res.status(201).json(issue);
  } catch (err: any) {
    console.error("PRISMA ERROR en POST /issues:", err);
    return res.status(500).json({
      message: "Error creando la incidencia",
      prismaCode: err?.code,
      prismaMeta: err?.meta,
      detail: String(err?.message ?? err),
    });
  }
});

/**
 * GET /issues -> lista incidencias (CON TRY/CATCH para ver el error real)
 */
router.get("/", async (_req, res) => {
  try {
    const issues = await prisma.issue.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, email: true, role: true } },
      },
    });

    return res.json(issues);
  } catch (err: any) {
    console.error("PRISMA ERROR en GET /issues:", err);
    return res.status(500).json({
      message: "Error en GET /issues",
      prismaCode: err?.code,
      prismaMeta: err?.meta,
      detail: String(err?.message ?? err),
    });
  }
});

/**
 * GET /issues/:id -> detalle por id
 */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

  try {
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, email: true, role: true } },
        comments: true,
      },
    });

    if (!issue) return res.status(404).json({ message: "No encontrada" });
    return res.json(issue);
  } catch (err: any) {
    console.error("PRISMA ERROR en GET /issues/:id:", err);
    return res.status(500).json({
      message: "Error en GET /issues/:id",
      prismaCode: err?.code,
      prismaMeta: err?.meta,
      detail: String(err?.message ?? err),
    });
  }
});

/**
 * PATCH /issues/:id/status -> actualizar estado
 */
const UpdateStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
});

router.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

  const parsed = UpdateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
  }

  try {
    const updated = await prisma.issue.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    return res.json(updated);
  } catch (err: any) {
    console.error("PRISMA ERROR en PATCH /issues/:id/status:", err);

    // P2025 suele ser "no existe"
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "Issue no existe" });
    }

    return res.status(500).json({
      message: "Error actualizando estado",
      prismaCode: err?.code,
      prismaMeta: err?.meta,
      detail: String(err?.message ?? err),
    });
  }
});

/**
 * DELETE /issues/:id -> eliminar incidencia
 */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  try {
    // Si hay comentarios asociados, bórralos primero
    await prisma.comment.deleteMany({ where: { issueId: id } });

    // Luego borra el Issue
    await prisma.issue.delete({ where: { id } });

    return res.status(204).send();
  } catch (err: any) {
    console.error("PRISMA ERROR en DELETE /issues/:id:", err);

    if (err?.code === "P2025") {
      return res.status(404).json({ message: "Issue no existe" });
    }

    return res.status(500).json({
      message: "Error eliminando la incidencia",
      prismaCode: err?.code,
      prismaMeta: err?.meta,
      detail: String(err?.message ?? err),
    });
  }
});

export default router;
