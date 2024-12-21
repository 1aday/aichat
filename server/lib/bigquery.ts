import { BigQuery } from '@google-cloud/bigquery';

// Initialize BigQuery with credentials
const bigquery = new BigQuery({
  projectId: process.env.BIGQUERY_PROJECT_ID || 'grox-436223'
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
    // Run the query
    const [job] = await bigquery.createQueryJob({
      query,
      location: 'US',
      maximumBytesBilled: '1000000000', // 1GB limit for safety
    });

    // Wait for query to complete and fetch results
    const [rows] = await job.getQueryResults();
    const [metadata] = await job.getMetadata();

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