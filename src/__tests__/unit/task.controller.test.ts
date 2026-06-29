import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { Task } from "@prisma/client";

// Mock the service module
vi.mock("../../services/task.service.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import * as taskService from "../../services/task.service.js";
import * as taskController from "../../controllers/task.controller.js";

const mockService = vi.mocked(taskService);

const mockTask: Task = {
  id: 1,
  title: "Test Task",
  description: "Test description",
  completed: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("TaskController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllTasks", () => {
    it("should return 200 with all tasks", async () => {
      const tasks = [mockTask];
      mockService.findAll.mockResolvedValue(tasks);
      const req = createMockRequest();
      const res = createMockResponse();

      await taskController.getAllTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(tasks);
    });

    it("should return 500 on service error", async () => {
      mockService.findAll.mockRejectedValue(new Error("DB error"));
      const req = createMockRequest();
      const res = createMockResponse();

      await taskController.getAllTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch tasks" });
    });
  });

  describe("getTaskById", () => {
    it("should return 200 with the task", async () => {
      mockService.findById.mockResolvedValue(mockTask);
      const req = createMockRequest({ params: { id: "1" } });
      const res = createMockResponse();

      await taskController.getTaskById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTask);
    });

    it("should return 404 when task not found", async () => {
      mockService.findById.mockResolvedValue(null);
      const req = createMockRequest({ params: { id: "999" } });
      const res = createMockResponse();

      await taskController.getTaskById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
    });

    it("should return 400 for invalid ID", async () => {
      const req = createMockRequest({ params: { id: "abc" } });
      const res = createMockResponse();

      await taskController.getTaskById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
    });
  });

  describe("createTask", () => {
    it("should return 201 with created task", async () => {
      const input = { title: "New Task", description: "Desc" };
      mockService.create.mockResolvedValue({
        ...mockTask,
        title: input.title,
        description: input.description,
      });
      const req = createMockRequest({ body: input });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ title: "New Task" })
      );
    });

    it("should return 400 when title is missing", async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Title is required and must be a non-empty string",
      });
    });

    it("should return 400 when title is empty string", async () => {
      const req = createMockRequest({ body: { title: "   " } });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Title is required and must be a non-empty string",
      });
    });

    it("should return 400 when title is not a string", async () => {
      const req = createMockRequest({ body: { title: 123 } });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Title is required and must be a non-empty string",
      });
    });

    it("should return 500 on service error", async () => {
      mockService.create.mockRejectedValue(new Error("DB error"));
      const req = createMockRequest({ body: { title: "Test" } });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to create task" });
    });
  });

  describe("updateTask", () => {
    it("should return 200 with updated task", async () => {
      const updateData = { title: "Updated", completed: true };
      mockService.update.mockResolvedValue({
        ...mockTask,
        ...updateData,
      });
      const req = createMockRequest({
        params: { id: "1" },
        body: updateData,
      });
      const res = createMockResponse();

      await taskController.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Updated", completed: true })
      );
    });

    it("should return 404 when task not found", async () => {
      mockService.update.mockRejectedValue(new Error("Task not found"));
      const req = createMockRequest({
        params: { id: "999" },
        body: { title: "Nope" },
      });
      const res = createMockResponse();

      await taskController.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
    });

    it("should return 400 for invalid ID", async () => {
      const req = createMockRequest({
        params: { id: "abc" },
        body: { title: "Test" },
      });
      const res = createMockResponse();

      await taskController.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
    });
  });

  describe("deleteTask", () => {
    it("should return 204 on successful delete", async () => {
      mockService.remove.mockResolvedValue(mockTask);
      const req = createMockRequest({ params: { id: "1" } });
      const res = createMockResponse();

      await taskController.deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("should return 404 when task not found", async () => {
      mockService.remove.mockRejectedValue(new Error("Task not found"));
      const req = createMockRequest({ params: { id: "999" } });
      const res = createMockResponse();

      await taskController.deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
    });

    it("should return 400 for invalid ID", async () => {
      const req = createMockRequest({ params: { id: "abc" } });
      const res = createMockResponse();

      await taskController.deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
    });
  });
});
