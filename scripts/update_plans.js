const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Parse .env file manually to read DIRECT_URL
const envPath = path.join(__dirname, "../.env");
let directUrl = process.env.DIRECT_URL;

if (!directUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/DIRECT_URL\s*=\s*(.*)/);
  if (match) {
    directUrl = match[1].trim();
  }
}

if (!directUrl) {
  console.error("Error: DIRECT_URL not found in environment or .env file.");
  process.exit(1);
}

// Clean up directUrl if it has quotes or comments
directUrl = directUrl.replace(/['"#]/g, "").trim();

console.log("Connecting to database using DIRECT_URL...");

const client = new Client({
  connectionString: directUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

const query = `
  UPDATE auth.users
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || CASE WHEN coalesce(raw_user_meta_data, '{}'::jsonb)->>'plan' = 'Pro' THEN jsonb_build_object('plan', 'Plus') ELSE '{}'::jsonb END
    || CASE WHEN coalesce(raw_user_meta_data, '{}'::jsonb)->>'subscription_plan' = 'Pro' THEN jsonb_build_object('subscription_plan', 'Plus') ELSE '{}'::jsonb END
    || CASE WHEN coalesce(raw_user_meta_data, '{}'::jsonb)->>'plan' = 'Studio' THEN jsonb_build_object('plan', 'Pro') ELSE '{}'::jsonb END
    || CASE WHEN coalesce(raw_user_meta_data, '{}'::jsonb)->>'subscription_plan' = 'Studio' THEN jsonb_build_object('subscription_plan', 'Pro') ELSE '{}'::jsonb END,
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || CASE WHEN coalesce(raw_app_meta_data, '{}'::jsonb)->>'plan' = 'Pro' THEN jsonb_build_object('plan', 'Plus') ELSE '{}'::jsonb END
    || CASE WHEN coalesce(raw_app_meta_data, '{}'::jsonb)->>'subscription_plan' = 'Pro' THEN jsonb_build_object('subscription_plan', 'Plus') ELSE '{}'::jsonb END
    || CASE WHEN coalesce(raw_app_meta_data, '{}'::jsonb)->>'plan' = 'Studio' THEN jsonb_build_object('plan', 'Pro') ELSE '{}'::jsonb END
    || CASE WHEN coalesce(raw_app_meta_data, '{}'::jsonb)->>'subscription_plan' = 'Studio' THEN jsonb_build_object('subscription_plan', 'Pro') ELSE '{}'::jsonb END;
`;

async function main() {
  try {
    await client.connect();
    console.log("Connected successfully.");
    console.log("Executing plans migration query...");
    const res = await client.query(query);
    console.log(`Success! Updated ${res.rowCount} rows in auth.users.`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

main();
