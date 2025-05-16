import {
  GoogleGenerativeAI,
  GenerativeModel as GeminiGenerativeModel,
  BatchEmbedContentsRequest, // Keep this type if needed internally, though the cast below makes it less critical
} from "@google/generative-ai";
// Correct import for PredictionServiceClient and helpers
import { PredictionServiceClient, helpers } from "@google-cloud/aiplatform"; // Ensure v1 is correct
import * as fs from "fs";
import * as path from "path";
import { sleep } from "bun";

// --- Environment Variables ---
// These are now the SOLE source of configuration for the Embeddings class

// REQUIRED (determines which provider/config is needed)
const MODEL_NAME = process.env.MODEL_NAME;

// Required if MODEL_NAME is a Gemini model (e.g., "embedding-001")
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Required if MODEL_NAME is a Vertex AI model (e.g., "text-embedding-005")
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || "us-west1"; // Default location if not set

// Optional: Path to explicit Vertex AI credentials file (overrides ADC)
const GOOGLE_CREDENTIALS_LOCATION = process.env.GOOGLE_CREDENTIALS_LOCATION;

// --- Interfaces and Types ---

interface EmbeddingProvider {
  embedContent(content: string): Promise<number[] | null>;
  embedContents(contents: string[]): Promise<(number[] | null)[]>;
  getEmptyEmbeddings(): Promise<number[]>;
}

// No longer needs to be exported, but useful internally for provider constructors
type EmbeddingsConfigInternal = {
  modelName: string;
  geminiApiKey?: string;
  gcpProjectId?: string;
  gcpLocation?: string;
  googleCredentialsLocation?: string;
};

interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

interface VertexEmbeddingPrediction {
  embeddings: {
    values: number[];
  };
}

// --- Gemini API Provider ---
// (No changes needed in this class implementation itself)
class GeminiEmbeddingProvider implements EmbeddingProvider {
  private readonly model: GeminiGenerativeModel;

  constructor(apiKey: string, modelName: string) {
    if (!apiKey) {
      throw new Error(
        `Gemini API Key was not provided for model ${modelName} (check GEMINI_API_KEY env var).`,
      );
    }
    const client = new GoogleGenerativeAI(apiKey);
    this.model = client.getGenerativeModel({ model: modelName });
  }

  async getEmptyEmbeddings(): Promise<number[]> {
    return Array(1536).fill(0);
  }

  async embedContent(content: string): Promise<number[]> {
    const response = await this.model.embedContent(content);
    if (!response.embedding?.values) {
      throw new Error("Invalid response structure from Gemini embedContent");
    }
    return response.embedding.values;
  }

  async embedContents(contents: string[]): Promise<number[][]> {
    const requests = contents.map((content) => ({ content }));
    const response = await this.model.batchEmbedContents({
      requests,
    } as unknown as BatchEmbedContentsRequest);
    console.info(
      "Recieved response from batch embeddings, num embeddings: ",
      response.embeddings.length,
    );
    if (
      !response.embeddings ||
      response.embeddings.length !== contents.length
    ) {
      throw new Error(
        "Invalid response structure or length mismatch from Gemini batchEmbedContents",
      );
    }
    return response.embeddings.map((emb) => {
      if (!emb?.values) {
        throw new Error(
          "Missing values in one of the embeddings from Gemini batchEmbedContents",
        );
      }
      return emb.values;
    });
  }
}

// --- Vertex AI API Provider ---
// (No changes needed in this class implementation itself)
class VertexAIEmbeddingProvider implements EmbeddingProvider {
  private readonly client: PredictionServiceClient;
  private readonly endpoint: string;
  private readonly modelId: string;
  private lastRequestTimestamp: number = 0;
  private readonly minIntervalMs: number;
  private readonly rpm: number;

  constructor(
    projectId: string,
    location: string,
    modelId: string,
    credentialsPath?: string,
  ) {
    if (!projectId) {
      throw new Error(
        `Google Cloud Project ID was not provided for Vertex AI model ${modelId} (check GCP_PROJECT_ID env var).`,
      );
    }
    if (!location) {
      throw new Error(
        `Google Cloud Location was not provided for Vertex AI model ${modelId} (check GCP_LOCATION env var).`,
      );
    }

    const publisher = "google";
    this.modelId = modelId;
    this.endpoint = `projects/${projectId}/locations/${location}/publishers/${publisher}/models/${this.modelId}`;

    const clientOptions: any = {
      apiEndpoint: `${location}-aiplatform.googleapis.com`,
    };

    const effectiveCredentialsPath = credentialsPath; // Already determined before calling constructor

    if (effectiveCredentialsPath) {
      try {
        const absolutePath = path.resolve(effectiveCredentialsPath);
        if (!fs.existsSync(absolutePath)) {
          throw new Error(`Credentials file not found at: ${absolutePath}`);
        }
        const credentialsFileContent = fs.readFileSync(absolutePath, "utf-8");
        const credentials = JSON.parse(
          credentialsFileContent,
        ) as GoogleCredentials;
        if (!credentials.client_email || !credentials.private_key) {
          throw new Error(
            "Credentials file is missing client_email or private_key.",
          );
        }
        clientOptions.credentials = credentials;
      } catch (error) {
        console.error(
          `Error loading or parsing credentials file from ${effectiveCredentialsPath}:`,
          error,
        );
        throw new Error(
          `Failed to load explicit credentials: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      console.info(
        "No explicit credentials path provided (GOOGLE_CREDENTIALS_LOCATION env var not set). Relying on Application Default Credentials (ADC) for Vertex AI.",
      );
    }

    this.client = new PredictionServiceClient(clientOptions);
    // Add RPM config
    const rpmEnv = process.env.EMBEDDINGS_RPM_LIMIT || "60"; // Default to 60 RPM
    this.rpm = parseInt(rpmEnv, 10);
    if (isNaN(this.rpm) || this.rpm <= 0) {
      console.warn(
        `[VertexAIEmbeddingProvider] Invalid EMBEDDINGS_RPM_LIMIT value "${rpmEnv}", defaulting to 60 RPM.`,
      );
      this.rpm = 60;
    }
    this.minIntervalMs = (60 * 1000) / this.rpm;
    console.info(
      `[VertexAIEmbeddingProvider] Configured for model ${modelId} with RPM: ${this.rpm} (Min Interval: ${this.minIntervalMs.toFixed(2)}ms)`,
    );
  }

  async getEmptyEmbeddings(): Promise<number[]> {
    return Array(768).fill(0);
  }

  private async predictVertexAI(instances: any[]): Promise<any[]> {
    const parameters = helpers.toValue({}); // Empty params for now
    const request = { endpoint: this.endpoint, instances, parameters };
    try {
      const [response] = await this.client.predict(request);
      if (
        !response.predictions ||
        response.predictions.length !== instances.length
      ) {
        throw new Error(
          `Vertex AI returned ${response.predictions?.length ?? 0} predictions, expected ${instances.length}.`,
        );
      }
      return response.predictions;
    } catch (error) {
      console.error("Error calling Vertex AI Prediction API:", error);
      throw new Error(
        `Vertex AI API request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async embedContent(content: string): Promise<number[]> {
    const instances = [helpers.toValue({ content })];
    const predictionsProto = await this.predictVertexAI(instances);
    const prediction = helpers.fromValue(
      predictionsProto[0],
    ) as VertexEmbeddingPrediction;
    if (prediction?.embeddings?.values) {
      return prediction.embeddings.values;
    } else {
      console.error(
        "Unexpected prediction structure:",
        JSON.stringify(prediction, null, 2),
      );
      throw new Error(
        "Failed to extract embeddings from Vertex AI prediction.",
      );
    }
  }

  async embedContentsBatch(contents: string[]): Promise<number[][]> {
    const instances = contents.map((content) => helpers.toValue({ content }));
    const predictionsProto = await this.predictVertexAI(instances);
    return predictionsProto.map((predictionProto: any, index: number) => {
      const prediction = helpers.fromValue(
        predictionProto,
      ) as VertexEmbeddingPrediction;
      if (prediction?.embeddings?.values) {
        return prediction.embeddings.values;
      } else {
        console.error(
          `Unexpected prediction structure for content index ${index}:`,
          JSON.stringify(prediction, null, 2),
        );
        throw new Error(
          `Failed to extract embeddings from Vertex AI prediction for content index ${index}.`,
        );
      }
    });
  }

  async embedContents(contents: string[]): Promise<(number[] | null)[]> {
    if (!contents || contents.length === 0) {
      console.info(
        `[${this.constructor.name}] embedContents: No texts provided, returning empty array.`,
      );
      return [];
    }

    console.info(
      `[${this.constructor.name}] embedContents: Embedding ${contents.length} texts sequentially with throttling (Target RPM: ${this.rpm}).`,
    );
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      if (content.length === 0) {
        allEmbeddings.push(await this.getEmptyEmbeddings());
        continue;
      }
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTimestamp;

      // For the very first request in this batch invocation, or if sufficient time has passed, no delay.
      // Otherwise, calculate and apply delay.
      if (
        this.lastRequestTimestamp !== 0 &&
        timeSinceLastRequest < this.minIntervalMs
      ) {
        const delayNeeded = this.minIntervalMs - timeSinceLastRequest;
        console.info(
          `[${this.constructor.name}] Throttling: waiting ${delayNeeded.toFixed(0)}ms before embedding text ${i + 1}/${contents.length}.`,
        );
        await sleep(delayNeeded); // Make sure sleep is imported/available
      }

      // Update timestamp *before* making the call to reserve the slot
      this.lastRequestTimestamp = Date.now();

      const displayText =
        content.length > 70 ? `${content.substring(0, 67)}...` : content;
      console.info(
        `[${this.constructor.name}] Embedding text ${i + 1}/${contents.length}: "${displayText}"`,
      );

      try {
        // Call the provider's own single-item embedding method
        const embedding = await this.embedContent(content); // This uses the existing single embedding logic
        allEmbeddings.push(embedding);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[${this.constructor.name}] Error embedding text ${i + 1} ("${displayText}"): ${errorMessage}`,
        );
        // Option: Rethrow to fail the entire batch
        throw error;
        // Option: Collect errors and return partial results (e.g., push null or an error object)
        // allEmbeddings.push(null); // Example: pushing null for failed embeddings
        // console.warn(`[${this.constructor.name}] Skipping text ${i + 1} due to error.`);
      }
    }

    console.info(
      `[${this.constructor.name}] embedContents: Successfully processed ${allEmbeddings.length} texts sequentially.`,
    );
    return allEmbeddings;
  }
}

// --- Main Embeddings Service ---

export class Embeddings {
  private readonly provider: EmbeddingProvider;

  // Constructor now reads directly from environment variables
  constructor() {
    // --- Read Configuration Directly from Environment ---
    const embeddingModelName = process.env.EMBEDDING_MODEL_NAME;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const gcpProjectId = process.env.GCP_PROJECT_ID;
    // Use default if GCP_LOCATION is not set
    const gcpLocation = process.env.GCP_LOCATION || "us-central1";
    const googleCredentialsLocation = process.env.GOOGLE_CREDENTIALS_LOCATION;

    console.info(
      `Initializing Embeddings service with EMBEDDING_MODEL_NAME: ${embeddingModelName}`,
    );

    // --- Determine Provider Based on EMBEDDING_MODEL_NAME ---
    if (!embeddingModelName) {
      throw new Error(
        "EMBEDDING_MODEL_NAME environment variable is required but not set.",
      );
    }

    if (
      ["text-embedding-005", "text-embedding-004"].includes(embeddingModelName)
    ) {
      // Specific Vertex model
      console.info(`Configuring for Vertex AI model: ${embeddingModelName}`);
      if (!gcpProjectId) {
        throw new Error(
          `GCP_PROJECT_ID environment variable is required for Vertex AI model ${embeddingModelName}.`,
        );
      }
      // Location has a default, but log it
      this.provider = new VertexAIEmbeddingProvider(
        gcpProjectId,
        gcpLocation,
        embeddingModelName,
        googleCredentialsLocation, // Pass explicit creds path if set
      );
    } else if (embeddingModelName.startsWith("embedding-")) {
      // Heuristic for Gemini models
      if (!geminiApiKey) {
        throw new Error(
          `GEMINI_API_KEY environment variable is required for Gemini model ${embeddingModelName}.`,
        );
      }
      this.provider = new GeminiEmbeddingProvider(
        geminiApiKey,
        embeddingModelName,
      );
    }
    // Add checks for other Vertex models here if needed (e.g., using includes('/'))
    else {
      throw new Error(
        `Unsupported or unrecognized EMBEDDING_MODEL_NAME: ${embeddingModelName}. Cannot determine embedding provider.`,
      );
    }
    console.info("Embeddings service provider initialized successfully.");
  }

  async generateEmbeddings(text: string): Promise<number[] | null> {
    // Add a check here? Or assume provider is always initialized correctly by constructor
    if (!this.provider) throw new Error("Embeddings provider not initialized.");
    return this.provider.embedContent(text);
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.provider) throw new Error("Embeddings provider not initialized.");
    if (!texts || texts.length === 0) {
      return [];
    }
    return this.provider.embedContents(texts);
  }
}

// --- Example Usage ---

async function runExample() {
  // --- Configuration ---
  // ENSURE these environment variables are set BEFORE running the script
  // (e.g., using a .env file and require('dotenv').config() AT THE VERY TOP,
  // or setting them in your shell/deployment environment)

  // Example required vars:
  // export MODEL_NAME="text-embedding-005" # Or "embedding-001"
  // export GCP_PROJECT_ID="your-project-id" # If using Vertex
  // export GCP_LOCATION="us-central1" # Optional if using Vertex, defaults to us-central1
  // export GOOGLE_CREDENTIALS_LOCATION="/path/to/your/keyfile.json" # Optional if using Vertex (uses ADC otherwise)
  // export GEMINI_API_KEY="your-api-key" # If using Gemini

  console.log("--- Running Embedding Examples ---");
  console.log("Model Name (from env):", process.env.MODEL_NAME || "Not Set");
  console.log(
    "Vertex AI Project ID (from env):",
    process.env.GCP_PROJECT_ID || "Not Set",
  );
  console.log(
    "Vertex AI Location (from env):",
    process.env.GCP_LOCATION || `us-central1 (Default)`,
  );
  console.log(
    "Vertex AI Explicit Credentials Path (from env):",
    process.env.GOOGLE_CREDENTIALS_LOCATION || "Not Set (Using ADC if needed)",
  );
  console.log(
    "Gemini API Key Set (from env):",
    process.env.GEMINI_API_KEY ? "Yes" : "No",
  );
  console.log("----------------------------------");

  const textsToEmbed = [
    "The quick brown fox jumps over the lazy dog.",
    "Exploring the capabilities of large language models.",
    "How does batch embedding work?",
  ];

  try {
    // --- Instantiate the simplified Embeddings class ---
    // It automatically reads config from environment variables
    console.log("\nAttempting to instantiate Embeddings service...");
    const embeddingsService = new Embeddings();
    console.log("Embeddings service instantiated.");

    // --- Use the service ---
    console.log("\n--- Generating Single Embedding ---");
    const singleResult = await embeddingsService.generateEmbeddings(
      textsToEmbed[0],
    );
    console.log(
      `Single Embedding (first 5 dims): [${singleResult.slice(0, 5).join(", ")}...] (Dim: ${singleResult.length})`,
    );

    console.log("\n--- Generating Batch Embeddings ---");
    const batchResult =
      await embeddingsService.generateEmbeddingsBatch(textsToEmbed);
    console.log(`Batch Embeddings: Received ${batchResult.length} embeddings.`);
    batchResult.forEach((embedding, index) => {
      console.log(
        `  Batch ${index + 1} (first 5 dims): [${embedding.slice(0, 5).join(", ")}...] (Dim: ${embedding.length})`,
      );
    });
  } catch (error) {
    console.error("\n--- Error during example execution ---");
    // Log the specific error message and potentially the stack
    console.error(
      "Error Message:",
      error instanceof Error ? error.message : String(error),
    );
    // if (error instanceof Error) { console.error("Stack Trace:", error.stack); }
  }
}

// --- Script Execution ---
if (require.main === module) {
  // IMPORTANT: If using .env files, load it BEFORE any other code runs
  // E.g., require('dotenv').config();
  runExample();
}
