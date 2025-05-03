import * as fs from "fs";
import * as path from "path";

/**
 * This script compiles the entire Solana program source code into a single file,
 * which can be fed into LLMs for debugging/development purposes.
 */

function findRustFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".rs")) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files.sort();
}

function concatenateRustFiles(
  rootDir: string,
  outputFile: string,
  includeFilenames = true
): number {
  try {
    const rustFiles = findRustFiles(rootDir);

    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let outputContent = "";

    rustFiles.forEach((filePath, index) => {
      if (index > 0) {
        outputContent += "\n\n";
      }

      const relPath = path.relative(rootDir, filePath);

      if (includeFilenames) {
        outputContent += `// File: ${relPath}\n`;
        outputContent += `// ${"=".repeat(80)}\n\n`;
      }

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        outputContent += content;
      } catch (error) {
        if (error instanceof Error) {
          outputContent += `// Error reading file ${relPath}: ${error.message}\n`;
        } else {
          outputContent += `// Error reading file ${relPath}: Unknown error\n`;
        }
      }
    });

    fs.writeFileSync(outputFile, outputContent);

    console.log(
      `Successfully concatenated ${rustFiles.length} Rust files into ${outputFile}`
    );
    return rustFiles.length;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("An unknown error occurred");
    }
    return 0;
  }
}

concatenateRustFiles("programs/inference-staking/src", "compiled-program.rs");
