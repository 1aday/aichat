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

// Initialize BigQuery with explicit credentials
const bigquery = new BigQuery({
  projectId: process.env.BIGQUERY_PROJECT_ID,
  credentials: credentials,
  location: 'EU', // Changed from US to EU as many datasets are in EU
});

export interface BigQueryResult {
  rows: Record<string, any>[];
  totalRows: number;
  schema: {
    fields: Array<{
      name: string;
      type: string;
    }>;
  };
}

export async function executeBigQueryQuery(query: string): Promise<BigQueryResult> {
  try {
    console.log('Executing BigQuery query:', query);

    // Run the query
    const [job] = await bigquery.createQueryJob({
      query,
      location: 'EU', // Changed from US to EU
      maximumBytesBilled: '1000000000', // 1GB limit for safety
    });

    console.log('Query job created, waiting for results...');

    // Wait for query to complete and fetch results
    const [rows] = await job.getQueryResults();
    const [metadata] = await job.getMetadata();

    console.log('Query completed successfully');

    // Get schema information
    const schema = {
      fields: metadata.statistics.query.schema.fields.map((field: any) => ({
        name: field.name,
        type: field.type,
      })),
    };

    return {
      rows,
      totalRows: rows.length,
      schema,
    };
  } catch (error: any) {
    console.error('BigQuery Error:', error);
    throw new Error(`BigQuery Error: ${error.message}`);
  }
}