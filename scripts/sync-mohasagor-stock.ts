import { AppError } from "../src/app/errors/AppError";
import { prisma } from "../src/app/config/prisma";
import { mohasagorImportService } from "../src/modules/Mohasagor/mohasagor.import.service";

const run = async (): Promise<void> => {
  try {
    const result = await mohasagorImportService.syncExistingProductStock((progress) => {
      console.info(JSON.stringify({ progress: true, ...progress }));
    });
    console.info(JSON.stringify({ success: true, ...result }));
  } catch (error) {
    if (error instanceof AppError) {
      console.error(JSON.stringify({ success: false, message: error.message }));
    } else {
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : undefined;
      console.error(JSON.stringify({
        success: false,
        message: "Database or stock sync failed; detailed error omitted",
        ...(code ? { code } : {}),
      }));
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

void run();
