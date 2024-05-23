const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function copyAndPrefixEnv(sourceFilePath, destinationFilePath) {
  try {
    // Load environment variables from source .env file
    const envConfig = dotenv.parse(await fs.readFile(sourceFilePath, 'utf8'));

    // Prefix environment variables with VITE_ and format them for the destination .env file
    const viteEnvConfig = Object.entries(envConfig)
      .map(([key, value]) => `VITE_${key}=${value}`)
      .join('\n');

    // Write the prefixed environment variables to the destination .env file
    await fs.writeFile(destinationFilePath, viteEnvConfig, 'utf8');

    console.log("Environment variables copied and prefixed with VITE_");
  } catch (err) {
    console.error("Error copying and prefixing environment variables:", err);
    throw err;
  }
};

async function updateEnvFile(key, value, envPath) {
  try {
    const data = await fs.readFile(envPath, "utf8");

    let updated = false;
    const lines = data.split("\n");
    const newLines = lines.map((line) => {
      const [currentKey, currentValue] = line.split("=");
      if (currentKey === key) {
        updated = true;
        return `${key}=${value}`;
      }
      return line;
    });

    if (!updated) {
      newLines.push(`${key}=${value}`);
    }

    await fs.writeFile(envPath, newLines.join("\n"));
    console.log(`${key} updated in .env file to ${value}`);
  } catch (err) {
    console.error("Error:", err);
    throw err;
  }
}

async function checkAndUpdateEnvVariables(currentDirectory_if) {
  let envData;
  try {
    envData = await fs.readFile(path.join(currentDirectory_if, ".env"), "utf8");
  } catch (err) {
    console.error("Error reading .env file:", err);
    return;
  }

  const envVars = envData.split("\n").reduce((acc, line) => {
    const [key, value] = line.split("=");
    acc[key] = value;
    return acc;
  }, {});

  if (!envVars.DAYDREAM_ENGINE || envVars.DAYDREAM_ENGINE === 'false') {
    let DAYDREAM_ENGINE_boolean = false;
    console.log(
      "DAYDREAM_ENGINE environment variable says we need to copy the current environment variables to the front end directory or to the ESSENCE_CREATOR",
    );

    const copyEnvDDE = await askQuestion(`You provided the ${process.env.ESSENCE_CREATOR} as the path to your front-end application. Do you want to copy the current environment variables to the front end directory? (yes/no): `);

    if (copyEnvDDE.toLowerCase() === "yes") {
      let path_to_front_env_file = path.join(process.env.ESSENCE_CREATOR, ".env");

      try {
        await copyAndPrefixEnv(process.env.RAGE_CREATOR, path_to_front_env_file);
        console.log("Environment variables copied and prefixed successfully.");

        DAYDREAM_ENGINE_boolean = true;
        await updateEnvFile("DAYDREAM_ENGINE", DAYDREAM_ENGINE_boolean, path.join(currentDirectory_if, ".env"));
        console.log(`DAYDREAM_ENGINE environment variable updated to ${DAYDREAM_ENGINE_boolean}.`);

        rl.close();
      } catch (err) {
        console.error("An error occurred:", err);
        rl.close();
      }
    } else {
      console.log('Operation cancelled by the user.');
      rl.close();
    }
  }
};

async function setupEnvironment() {
  try {
    await checkAndUpdateEnvVariables();
  } catch (err) {
    console.error("An error occurred during the setup environment process:", err);
    rl.close();
  }
}

// Call the setupEnvironment function to start the process
setupEnvironment();
