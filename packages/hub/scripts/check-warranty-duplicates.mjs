import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.local (try root first, then packages/hub)
function loadEnv() {
  const envPaths = [
    path.join(__dirname, "../../../.env.local"), // root .env.local
    path.join(__dirname, "../.env.local"), // packages/hub .env.local
  ];

  const env = {};
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [key, ...valueParts] = trimmed.split("=");
        if (key) {
          env[key.trim()] = valueParts.join("=").trim();
        }
      }
      break; // use first found
    }
  }
  return env;
}

const envVars = loadEnv();
const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findDuplicates() {
  console.log("📋 Checking for duplicate warranty receipts...\n");

  try {
    // List all files in receipts bucket
    const { data: files, error } = await supabase.storage.from("receipts").list();

    if (error) {
      console.error("Error listing receipts:", error.message);
      process.exit(1);
    }

    if (!files || files.length === 0) {
      console.log("✅ No receipt files found in bucket");
      return;
    }

    // Group files by warranty ID
    const filesByWarrantyId = new Map();

    for (const file of files) {
      // Extract warranty ID from filename (format: name-{uuid}.ext)
      // UUID format: 8-4-4-4-12 hex characters separated by hyphens
      const uuidRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
      const match = file.name.match(uuidRegex);

      if (match) {
        const warrantyId = match[1];
        if (!filesByWarrantyId.has(warrantyId)) {
          filesByWarrantyId.set(warrantyId, []);
        }
        // Store both filename and upload timestamp
        filesByWarrantyId.get(warrantyId).push({
          name: file.name,
          created: file.created_at,
          updated: file.updated_at,
        });
      } else {
        console.warn(`⚠️  Could not extract warranty ID from: ${file.name}`);
      }
    }

    // Find warranties with multiple files
    let duplicateCount = 0;
    const duplicatesMap = new Map();

    for (const [warrantyId, files] of filesByWarrantyId.entries()) {
      if (files.length > 1) {
        duplicateCount++;
        duplicatesMap.set(warrantyId, files);
      }
    }

    if (duplicateCount === 0) {
      console.log("✅ No duplicate receipts found!");
      console.log(`   Total files: ${files.length}`);
      return;
    }

    console.log(`⚠️  Found ${duplicateCount} warranties with duplicate receipts:\n`);

    // Display duplicates
    let totalDuplicateFiles = 0;
    for (const [warrantyId, files] of duplicatesMap.entries()) {
      console.log(`  Warranty ID: ${warrantyId}`);
      console.log(`  Files (${files.length}):`);

      // Sort by creation date to identify which is newest
      const sorted = [...files].sort(
        (a, b) => new Date(b.created || b.updated) - new Date(a.created || a.updated)
      );

      sorted.forEach((file, index) => {
        const date = new Date(file.created || file.updated);
        const isNewest = index === 0 ? "✓ (KEEP)" : "✗ (DELETE)";
        console.log(`    • ${file.name} ${isNewest}`);
        console.log(`      Created: ${date.toLocaleString()}`);
      });
      console.log("");

      totalDuplicateFiles += files.length - 1; // Count files to delete (excluding newest)
    }

    console.log(
      `📊 Summary: ${duplicateCount} warranties with ${totalDuplicateFiles} duplicate file(s) to delete`
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
}

findDuplicates();
