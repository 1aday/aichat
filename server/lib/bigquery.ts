import { BigQuery } from '@google-cloud/bigquery';

// Initialize BigQuery with credentials
const bigquery = new BigQuery({
  projectId: 'grox-436223',
  credentials: {
    client_email: "supermetrics@grox-436223.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5QFsvEWSJ+2AK\nZFujeyqcm24KrxoMbXXyShA5HPu7SxV7xnjuNJU4d6xmIyjWQtgBZhxmSqgsmHsy\nupNKhmiToFl7rvRKlbQeHzj0zfnJKlKYsfHb/MhDC4P123s/8EkmszKtdUcBOl3U\n/ilhADC+CaAbd+MOdLqz0eVsNepbKxDEikYnZ+wxy0VG8W83ORxeig+/g3oCMVIx\ndxyRMDze8IUlCFa57U38BSr3/VP+GLO/TgkTQSQ5HTl9h9APRM/JGKyYG/xSXlnj\niGjQVemmmGwwqwuq0BK5dNKH/9OuAocTuqtqonRhjGefqQmeIpCuNImff6HZfWRs\nw3N7EjwfAgMBAAECggEARyLNYP+eydV7hcIP5nEPZd/Rm8ythgQqfIWwQR4+FCe6\n8jK+kUoj2vEphHcP4Wb9p1vcn/MfLTDIbixzDvUaB0ZV1kbSjCl8Zuy6ZFcMChF0\ncioyo7Un+Ybcf3Zul5jfnjrFxRH52CDfk0CeBx+Zl//+OU4KJKzyXMbHAIybl7IE\nEnbT5ilnJ6MxakZjr8w488mq2yujEB91ZhvAHxk7QRzy8kO73D1ke/qUbU8CW/ck\n07loa/0Y5AxHfZMYlajTx4hd6Cl1eML2J1KfHQavNwy64T+KTTF/9s7mexHsXw7X\np75jXL4TlXe8lBUhLuyuWNGpsXMd/y0CcJvUj8ZeQQKBgQDrsbbltKI0dUG+U0Fo\n+I3u3trALOoDOPGo6VjqfvKlk0/LL3w6ZcTg8uolsDRJKxEeONcMyJGgwYxVdkm6\n7w114/g3O72XX+jtzkaG44Jgm5JTzbDEz+x9ttb8/dAjpoTtFt/iAG0Mfv/DYSDn\nwO5U11D1PavS4qAAS7v4AW+crwKBgQDJNh1ttAFV04DJ2fQJrmIsLR5tnRJz64ET\nM6On5nw6uPrK71CZvCsvem+r8nG0eHq/oWDzU2XqxFC/eFBE7b8ZHPjaRCT24P+T\nPn0U7vG5hxZu1RaFJMiiNf+9t1kN86RZ75wSkEzMk5kCxMAG97HKIwUAR7ypXStL\nstvZ1r6TkQKBgQCJx6aaW2Di95TKFNNM8NfPxrjr1JWr8pLaYiaXVkS0ZAwmRAkD\n/k/8DCSyiXHXP/TOzP1xvKHc7qgBoZdyTqJ4wx5r82FeZzO8KHR0D/U8UlVU5g4q\nzz15M/QzipAs9wAHtPKFpCgbQPZ0mYfp0o/ASupJopaaPd64rY0han17gwKBgEmz\nNaJKLbcHKoRE/htRsYnm2N9jii/Fkli7MHW+ecB0owAUGlzFTLguS5saycVF4Agz\nDzTxVkJguAb6BcTJpJaJQymHjlaTYWnImL5DK20+atwb1wzbxVWNG+icsNToakm6\n91rhWhAQ/BnEgWXL8mZM33cTz6nlg4dNszOecd3RAoGBALmXgJ5DPHvZovtVQ/Vs\nfCOACXH/rUmeNolUECe8x7LcsRytGEE6l7DeKpySzcMNATfkQxuQEhfK3GJhRp46\nC9CLCm6VceduToTTgVsK81NAJAWgEKOUxK7MHoNKyf/D+EEL79lgDMT/3CzKJbwa\nKYTbhOuAlI/LsWxt4rSOXpGe\n-----END PRIVATE KEY-----\n",
    client_id: "118134426455314165222",
  }
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
    throw new Error(`BigQuery Error: ${error.message}`);
  }
}