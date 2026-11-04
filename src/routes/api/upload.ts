import { createFileRoute } from "@tanstack/react-router";

const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      // Private uploads: the files never leave the local disk and are served
      // back only through /api/files/$id after a permission check.
      POST: async ({ request }) => {
        const [{ getDb }, { identityFromSessionToken, readCookie, SESSION_COOKIE }, { storeFile }, shared, { enforce }] =
          await Promise.all([
            import("@/server/db.ts"),
            import("@/server/auth.ts"),
            import("@/server/storage.ts"),
            import("@/shared/referrals.ts"),
            import("@/server/rate-limit.ts"),
          ]);

        const identity = identityFromSessionToken(
          readCookie(request.headers.get("cookie"), SESSION_COOKIE),
        );
        if (!identity) {
          return Response.json({ message: "Please sign in." }, { status: 401 });
        }

        // Keyed by the account, so one person opening many tabs shares one budget.
        const limited = enforce("upload", request, identity.tokenIdentifier);
        if (limited) return limited;

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
          return Response.json({ message: "No file was uploaded." }, { status: 400 });
        }
        const contentType =
          file.type || EXTENSION_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
        if (!(shared.ALLOWED_FILE_TYPES as readonly string[]).includes(contentType)) {
          return Response.json(
            { message: "Only PDF, JPEG, PNG or WebP files can be attached." },
            { status: 400 },
          );
        }
        if (file.size > shared.MAX_FILE_BYTES) {
          return Response.json({ message: "Each file must be 15 MB or smaller." }, { status: 400 });
        }

        const bytes = new Uint8Array(await file.arrayBuffer());

        // The declared type is the browser's claim; the bytes decide.
        const { declaredTypeMatchesBytes } = await import("@/server/file-type.ts");
        if (!declaredTypeMatchesBytes(contentType, bytes)) {
          return Response.json(
            {
              message:
                "This file does not look like a PDF, JPEG, PNG or WebP. Check the file and try again.",
            },
            { status: 400 },
          );
        }

        const storageId = storeFile(getDb(), { bytes, fileName: file.name, contentType });
        return Response.json({ storageId });
      },
    },
  },
});
