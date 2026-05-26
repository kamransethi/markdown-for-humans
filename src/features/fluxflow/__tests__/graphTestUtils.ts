import type { GraphProjectionContext, GraphProjectionDb } from '../graphProjection';

export function createMockProjectionDb(args: {
  docs: Array<{ path: string; title: string }>;
  links: Record<string, Array<{ targetTitle: string; targetPath: string | null }>>;
  tags?: Record<string, string[]>;
}): GraphProjectionDb {
  return {
    getAllDocuments: () => args.docs,
    getOutgoingLinks: (docPath: string) => args.links[docPath] ?? [],
    getTagsForDocument: (docPath: string) => args.tags?.[docPath] ?? [],
  };
}

export function createProjectionContext(
  workspacePath: string,
  docs: Array<{ path: string; title: string }>,
  links: Record<string, Array<{ targetTitle: string; targetPath: string | null }>>,
  tags?: Record<string, string[]>
): GraphProjectionContext {
  return {
    workspacePath,
    db: createMockProjectionDb({ docs, links, tags }),
  };
}
