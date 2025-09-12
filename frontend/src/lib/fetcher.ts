export const fetcher = async (url: string) => {
    const res = await fetch(url, {
      credentials: 'include', // Include cookies for authenticated APIs
    });
    if (!res.ok) {
      const errorData = await res.json();
      const error = new Error(errorData.message || 'An error occurred.');
      throw error;
    }
    return res.json();
  };
  