import { BigQuery } from '@google-cloud/bigquery';

// Initialize BigQuery with credentials from environment
let credentials;
try {
  if (process.env.GOOGLE_CREDENTIALS) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  }
} catch (error) {
  console.error('Error parsing GOOGLE_CREDENTIALS:', error);
  throw new Error('Invalid GOOGLE_CREDENTIALS format');
}

const bigquery = new BigQuery({
  projectId: process.env.BIGQUERY_PROJECT_ID,
  credentials: credentials,
});

export interface BigQueryResult {
  rows: Record<string, any>[];
}

export async function executeBigQueryQuery(query: string): Promise<BigQueryResult> {
  try {
    // Run the query
    const [job] = await bigquery.createQueryJob({
      query,
      maximumBytesBilled: '1000000000', // 1GB limit for safety
    });

    // Wait for query to complete and fetch results
    const [rows] = await job.getQueryResults();

    // Return just the rows
    return {
      rows: rows || []
    };
  } catch (error: any) {
    console.error('BigQuery Error:', error);
    throw error;
  }
}