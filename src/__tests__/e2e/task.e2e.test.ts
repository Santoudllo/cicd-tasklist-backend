import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
  default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
  beforeEach(async () => {
    // Clean up database between tests
    await testPrisma.task.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe("POST /api/tasks", () => {
    it("should create a new task", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ title: "E2E Task", description: "E2E Description" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.title).toBe("E2E Task");
      expect(res.body.description).toBe("E2E Description");
      expect(res.body.completed).toBe(false);
    });

    it("should create a task without description", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ title: "No Desc Task" });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("No Desc Task");
      expect(res.body.description).toBeNull();
    });

    it("should return 400 when title is missing", async () => {
      const res = await request(app).post("/api/tasks").send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Title is required");
    });

    it("should return 400 when title is empty", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ title: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Title is required");
    });
  });

  describe("GET /api/tasks", () => {
    it("should return all tasks ordered by createdAt desc", async () => {
      await testPrisma.task.create({ data: { title: "Task 1" } });
      await testPrisma.task.create({ data: { title: "Task 2" } });

      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe("Task 2");
      expect(res.body[1].title).toBe("Task 1");
    });

    it("should return empty array when no tasks", async () => {
      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("should return a task by ID", async () => {
      const task = await testPrisma.task.create({
        data: { title: "Find Me", description: "Here I am" },
      });

      const res = await request(app).get(`/api/tasks/${task.id}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Find Me");
      expect(res.body.description).toBe("Here I am");
    });

    it("should return 404 for non-existent task", async () => {
      const res = await request(app).get("/api/tasks/99999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });

    it("should return 400 for invalid ID", async () => {
      const res = await request(app).get("/api/tasks/abc");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid task ID");
    });
  });

  describe("PUT /api/tasks/:id", () => {
    it("should update a task", async () => {
      const task = await testPrisma.task.create({
        data: { title: "Original Title" },
      });

      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ title: "Updated Title", completed: true });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Title");
      expect(res.body.completed).toBe(true);
    });

    it("should partially update a task", async () => {
      const task = await testPrisma.task.create({
        data: { title: "Keep Title", description: "Keep Desc" },
      });

      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ completed: true });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Keep Title");
      expect(res.body.completed).toBe(true);
    });

    it("should return 404 for non-existent task", async () => {
      const res = await request(app)
        .put("/api/tasks/99999")
        .send({ title: "Nope" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete a task", async () => {
      const task = await testPrisma.task.create({
        data: { title: "Delete Me" },
      });

      const deleteRes = await request(app).delete(`/api/tasks/${task.id}`);
      expect(deleteRes.status).toBe(204);

      // Verify deletion
      const getRes = await request(app).get(`/api/tasks/${task.id}`);
      expect(getRes.status).toBe(404);
    });

    it("should return 404 for non-existent task", async () => {
      const res = await request(app).delete("/api/tasks/99999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });
  });

  describe("Full CRUD Flow", () => {
    it("should create, read, update, verify update, delete, and verify delete", async () => {
      // Create
      const createRes = await request(app)
        .post("/api/tasks")
        .send({ title: "CRUD Task", description: "Full flow" });
      expect(createRes.status).toBe(201);
      const taskId = createRes.body.id;

      // Read
      const readRes = await request(app).get(`/api/tasks/${taskId}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.title).toBe("CRUD Task");

      // Update
      const updateRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: "Updated CRUD Task", completed: true });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.title).toBe("Updated CRUD Task");
      expect(updateRes.body.completed).toBe(true);

      // Verify update
      const verifyRes = await request(app).get(`/api/tasks/${taskId}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.title).toBe("Updated CRUD Task");
      expect(verifyRes.body.completed).toBe(true);

      // Delete
      const deleteRes = await request(app).delete(`/api/tasks/${taskId}`);
      expect(deleteRes.status).toBe(204);

      // Verify delete
      const verifyDeleteRes = await request(app).get(`/api/tasks/${taskId}`);
      expect(verifyDeleteRes.status).toBe(404);
    });
  });
});
