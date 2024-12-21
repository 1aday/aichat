export const apiClient = {
  async post(url: string, data: any) {
    console.log(`📡 API Call to ${url}`, {
      method: 'POST',
      data
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const responseData = await response.json();
    console.log(`📡 Response from ${url}`, responseData);

    if (!response.ok) {
      console.error(`📡 Error from ${url}`, responseData);
      throw new Error(responseData.error || 'API request failed');
    }

    return responseData;
  }
}; 