"use client";

import type {
  Project,
  ProjectFolder,
  ProjectFolderSettings,
  ToolProjectSummary,
} from "@/store/useColorByNumberStore";

const DB_NAME = "mosaci-tools";
const DB_VERSION = 1;
const PROJECT_STORE = "project-folders";
const GUEST_PROJECT_ID = "guest-temp-project";
const MAX_PROJECTS_TO_KEEP = 50;
const STORAGE_WARNING_RATIO = 0.8;
const STORAGE_TARGET_RATIO = 0.75;
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface StoredToolProject extends ProjectFolder {
  settings: ProjectFolderSettings;
  files: Project[];
  deletedAt?: string;
}

export type StoredToolProjectSummary = ToolProjectSummary;

export interface BrowserStorageEstimate {
  usage: number;
  quota: number;
  usageRatio: number;
  remaining: number;
}

export interface StorageCleanupResult {
  before: BrowserStorageEstimate | null;
  after: BrowserStorageEstimate | null;
  trashDeleted: number;
  previewsDeleted: number;
  lruDeleted: number;
  overflowDeleted: number;
  clearedAll: boolean;
}

const hasIndexedDb = () => typeof indexedDB !== "undefined";

// Persistent connection — avoids re-opening on every transaction
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error("IndexedDB is not available."));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        const store = db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const transaction = db.transaction(PROJECT_STORE, mode);
        const store = transaction.objectStore(PROJECT_STORE);
        const request = callback(store);

        transaction.oncomplete = () => resolve(request ? request.result : undefined);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

// In-memory project cache — avoids re-reading large objects from IndexedDB
const projectCache = new Map<string, StoredToolProject>();

export function invalidateProjectCache(id?: string) {
  if (id) projectCache.delete(id);
  else projectCache.clear();
}

export async function saveToolProject(
  project: StoredToolProject,
): Promise<void> {
  projectCache.set(project.id, project);
  await runTransaction("readwrite", (store) => store.put(project));
}

export async function loadToolProject(
  id: string,
): Promise<StoredToolProject | null> {
  const cached = projectCache.get(id);
  if (cached) return cached;
  const result = await runTransaction<StoredToolProject>("readonly", (store) =>
    store.get(id),
  );
  if (result) projectCache.set(id, result);
  return result ?? null;
}

export async function deleteToolProject(id: string): Promise<void> {
  projectCache.delete(id);
  await runTransaction("readwrite", (store) => store.delete(id));
}

export async function clearAllToolProjects(): Promise<void> {
  projectCache.clear();
  await runTransaction("readwrite", (store) => store.clear());
}

export async function estimateBrowserStorage(): Promise<BrowserStorageEstimate | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;
  if (quota <= 0) return null;

  return {
    usage,
    quota,
    usageRatio: usage / quota,
    remaining: Math.max(0, quota - usage),
  };
}

async function getAllToolProjects(): Promise<StoredToolProject[]> {
  return (
    (await runTransaction<StoredToolProject[]>("readonly", (store) =>
      store.getAll(),
    )) ?? []
  );
}

function stripProjectPreviews(project: StoredToolProject): StoredToolProject {
  return {
    ...project,
    files: (project.files ?? []).map((file) => ({
      ...file,
      thumbnailDataUrl: "",
    })),
  };
}

async function putManyAndDeleteMany(
  projectsToPut: StoredToolProject[],
  idsToDelete: string[],
): Promise<void> {
  await runTransaction("readwrite", (store) => {
    projectsToPut.forEach((project) => store.put(project));
    idsToDelete.forEach((id) => store.delete(id));
  });
}

export async function hydrateStoredProjectFiles(
  files: Project[],
): Promise<Project[]> {
  return Promise.all(
    files.map(async (file) => {
      if (file.thumbnailDataUrl || !file.originalFile) return file;

      const thumbnailDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file.originalFile);
      });

      return { ...file, thumbnailDataUrl };
    }),
  );
}

export async function cleanupToolProjectStorage(): Promise<StorageCleanupResult> {
  const before = await estimateBrowserStorage();
  const now = Date.now();
  const allProjects = await getAllToolProjects();
  let projects = allProjects;
  let trashDeleted = 0;
  let previewsDeleted = 0;
  let lruDeleted = 0;
  let overflowDeleted = 0;

  const trashIds = projects
    .filter((project) => {
      if (!project.deletedAt) return false;
      return now - new Date(project.deletedAt).getTime() > TRASH_RETENTION_MS;
    })
    .map((project) => project.id);

  if (trashIds.length > 0) {
    trashDeleted = trashIds.length;
    projects = projects.filter((project) => !trashIds.includes(project.id));
    await putManyAndDeleteMany([], trashIds);
  }

  const previewProjects = projects
    .filter((project) =>
      (project.files ?? []).some((file) => Boolean(file.thumbnailDataUrl)),
    )
    .map(stripProjectPreviews);

  if (previewProjects.length > 0) {
    previewsDeleted = previewProjects.reduce(
      (count, project) =>
        count + (project.files ?? []).filter((file) => !file.thumbnailDataUrl).length,
      0,
    );
    await putManyAndDeleteMany(previewProjects, []);
    const previewIds = new Set(previewProjects.map((project) => project.id));
    projects = projects.map((project) =>
      previewIds.has(project.id) ? stripProjectPreviews(project) : project,
    );
  }

  const newestFirst = [...projects].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const overflowIds = newestFirst
    .slice(MAX_PROJECTS_TO_KEEP)
    .map((project) => project.id);

  if (overflowIds.length > 0) {
    overflowDeleted = overflowIds.length;
    projects = newestFirst.slice(0, MAX_PROJECTS_TO_KEEP);
    await putManyAndDeleteMany([], overflowIds);
  }

  let currentEstimate = await estimateBrowserStorage();
  if (currentEstimate && currentEstimate.usageRatio > STORAGE_WARNING_RATIO) {
    const lruProjects = [...projects].sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );
    const idsToDelete: string[] = [];

    for (const project of lruProjects) {
      if (lruProjects.length - idsToDelete.length <= 1) break;
      if (
        currentEstimate &&
        currentEstimate.usageRatio <= STORAGE_TARGET_RATIO
      ) {
        break;
      }

      idsToDelete.push(project.id);
      await putManyAndDeleteMany([], [project.id]);
      lruDeleted += 1;
      currentEstimate = await estimateBrowserStorage();
    }
  }

  return {
    before,
    after: await estimateBrowserStorage(),
    trashDeleted,
    previewsDeleted,
    lruDeleted,
    overflowDeleted,
    clearedAll: false,
  };
}

export async function listToolProjects(): Promise<StoredToolProjectSummary[]> {
  const projects = await runTransaction<StoredToolProject[]>(
    "readonly",
    (store) => store.getAll(),
  );

  return (projects ?? [])
    .filter((project) => project.id !== GUEST_PROJECT_ID)
    .map((project) => {
      const files = project.files ?? [];
      return {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        fileCount: files.length,
        completedCount: files.filter((file) => file.status === "completed")
          .length,
        thumbnailDataUrl: files[0]?.thumbnailDataUrl,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export function createEmptyToolProject(
  name: string,
  settings: ProjectFolderSettings,
): StoredToolProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    settings,
    files: [],
  };
}
